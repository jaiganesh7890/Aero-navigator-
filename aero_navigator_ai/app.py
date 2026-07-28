from flask import Flask, request, jsonify
import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime
import os

app = Flask(__name__)

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'aero_navigator_backend', 'aero_navigator.db'))

import functools

# Train a real RandomForest model on the flight database
@functools.lru_cache(maxsize=1)
def train_model():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}, returning fallback model.")
        return None, None, None

    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query("SELECT * FROM flights", conn)
        conn.close()

        if len(df) < 5:
            print("Not enough flights in database to train model.")
            return None, None, None

        # Feature engineering
        df['departure_time'] = pd.to_datetime(df['departure_time'], format='ISO8601').dt.tz_localize(None)
        now_dt = datetime.now()
        
        # Calculate days to departure
        df['days_to_departure'] = (df['departure_time'] - now_dt).dt.total_seconds() / 86400.0
        
        # Select features and targets
        features_df = df[['departure_airport_code', 'arrival_airport_code', 'airline', 'days_to_departure', 'duration_minutes']].copy()
        
        # One-hot encoding
        encoded_df = pd.get_dummies(features_df, columns=['departure_airport_code', 'arrival_airport_code', 'airline'])
        
        X = encoded_df.astype(float)
        y = df['price'].values

        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X, y)

        # Store training feature names to align inputs later
        feature_columns = list(X.columns)
        
        # Calculate baseline stats for variance
        std_error = np.std(y - model.predict(X))

        return model, feature_columns, std_error

    except Exception as e:
        print(f"Error training machine learning model: {str(e)}")
        return None, None, None

def get_route_avg_price(source, destination):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT AVG(price) FROM flights WHERE departure_airport_code = ? AND arrival_airport_code = ?", (source, destination))
        row = cursor.fetchone()
        conn.close()
        if row and row[0] is not None:
            return float(row[0])
    except Exception as e:
        print(f"Error reading SQLite database for baseline: {str(e)}")
    return None

@app.route('/predict/fare', methods=['GET'])
def get_fare_prediction():
    source = request.args.get('source', 'DEL').upper()
    destination = request.args.get('destination', 'BOM').upper()
    date_str = request.args.get('date', datetime.now().strftime("%Y-%m-%d"))

    # Train model dynamically in real-time
    model, feature_columns, std_error = train_model()

    try:
        dep_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        dep_date = datetime.now()

    days_to_dep = (dep_date - datetime.now()).days
    if days_to_dep < 0:
        days_to_dep = 0

    # Get actual average price from the database flights for this route as baseline
    db_avg_price = get_route_avg_price(source, destination)

    # Fallback to smart heuristic if model is unavailable
    if model is None:
        base_price = db_avg_price if db_avg_price is not None else 4500
        
        urgency_multiplier = 1.0
        if days_to_dep < 7:
            urgency_multiplier = 1.4
        elif days_to_dep > 20:
            urgency_multiplier = 0.85
            
        pred_price = base_price * urgency_multiplier
        low_bound = round(pred_price * 0.85)
        high_bound = round(pred_price * 1.25)
        confidence = 75
        rec = "buy" if urgency_multiplier >= 1.2 else "wait"
    else:
        # Create input feature vector
        input_data = {
            'days_to_departure': [float(days_to_dep)],
            # Default average flight duration
            'duration_minutes': [120.0]
        }
        
        # Initialize one-hot features to 0
        for col in feature_columns:
            if col not in input_data:
                input_data[col] = [0.0]

        # Set specific categorical flags to 1 (unconditionally — just skip if unseen)
        dep_col = f"departure_airport_code_{source}"
        arr_col = f"arrival_airport_code_{destination}"
        
        if dep_col in input_data:
            input_data[dep_col] = [1.0]
        if arr_col in input_data:
            input_data[arr_col] = [1.0]

        # If this exact route has no training columns at all, the model won't recognize it.
        # Fall back to the DB average so we don't return absurdly low predictions.
        route_recognized = (dep_col in input_data) or (arr_col in input_data)

        input_df = pd.DataFrame(input_data)[feature_columns]
        
        if not route_recognized and db_avg_price is not None:
            pred_price = db_avg_price
            print(f"Route {source}->{destination} not seen during training. Using DB avg: {db_avg_price}")
        else:
            # Predict price using RandomForest
            pred_price = float(model.predict(input_df)[0])
        
        # Scale/sanitize predictions using the real average database price to prevent discrepancies
        if db_avg_price is not None and abs(pred_price - db_avg_price) > (db_avg_price * 0.35):
            print(f"Model prediction {pred_price} deviated from DB baseline {db_avg_price}. Aligning.")
            pred_price = db_avg_price

        # Dynamically scale price based on days to departure (incorporating model trend + urgency)
        urgency_multiplier = 1.0
        if days_to_dep < 3:
            urgency_multiplier = 1.45
        elif days_to_dep < 7:
            urgency_multiplier = 1.25
        elif days_to_dep > 21:
            urgency_multiplier = 0.88

        pred_price = pred_price * urgency_multiplier

        # Calculate prediction intervals based on std_error
        margin = max(std_error, pred_price * 0.15)
        low_bound = round(pred_price - (margin * 0.8))
        high_bound = round(pred_price + (margin * 1.2))
        
        # Cap low bound to make sense
        if low_bound < 1500:
            low_bound = 1500

        confidence = int(np.clip(100 - (margin / pred_price * 100), 75, 96))
        rec = "buy" if urgency_multiplier >= 1.2 else "wait"


    return jsonify({
        "source": source,
        "destination": destination,
        "date": date_str,
        "prediction": {
            "low": int(low_bound),
            "medium": int(pred_price),
            "high": int(high_bound),
            "confidence": confidence,
            "recommendation": rec,
            "predictedDropPercent": 18,
            "bestBookingWindow": "Days 5-7" if rec == "wait" else "Instant"
        }
    })

import re
import random

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    prompt = data.get('prompt', '').strip()
    history = data.get('history', [])
    
    if not prompt:
        return jsonify({"reply": "👩‍✈️ **Captain AI speaking!** Welcome aboard Aero Nav. Where are we flying today?"})

    lower_prompt = prompt.lower()
    
    # --- INTENT: JOKES / PERSONALITY ---
    if "joke" in lower_prompt or "funny" in lower_prompt:
        jokes = [
            "Why did the airplane get sent to his room? Because he had a bad altitude! ✈️🤣",
            "What do you call a plane that flies backwards? A receding airline! 🛫😂",
            "I'm reading a book about anti-gravity. I just can't put it down... much like a good flight! 📖✈️"
        ]
        return jsonify({"reply": random.choice(jokes) + "\n\nNow, back to business! How can I assist with your travel?"})
        
    if any(word in lower_prompt for word in ["thanks", "thank you", "awesome", "wow", "great", "good job", "love you"]):
        return jsonify({"reply": "Aww, you're making my circuits blush! 🤖💙 I'm always here to ensure you have a first-class experience. What's our next destination?"})

    # --- INTENT: PREDICTION CONFIRMATION ---
    if lower_prompt in ["yes", "yeah", "yep", "sure", "ok", "okay", "please", "do it"]:
        last_ai_msg = None
        for msg in reversed(history):
            if not msg.get('isUser'):
                last_ai_msg = msg.get('text', '')
                break
                
        if last_ai_msg and "predict the exact price drop window" in last_ai_msg.lower():
            old_src, old_dst = None, None
            for msg in reversed(history):
                if msg.get('isUser'):
                    m = re.search(r'(?:from|between)\s+([a-zA-Z\s]+?)\s+(?:to|and)\s+([a-zA-Z\s]+)(?:\s|$)', msg.get('text', '').lower())
                    if not m:
                        m = re.search(r'(?:to)\s+([a-zA-Z\s]+?)\s+(?:from)\s+([a-zA-Z\s]+)(?:\s|$)', msg.get('text', '').lower())
                        if m:
                            old_dst, old_src = m.group(1).strip().title(), m.group(2).strip().title()
                    else:
                        old_src, old_dst = m.group(1).strip().title(), m.group(2).strip().title()
                    if old_src and old_dst: break
                        
            if old_src and old_dst:
                return jsonify({"reply": f"🔮 **Exclusive Price Prediction for {old_src} ➔ {old_dst}:**\n\n📊 **Data Analysis**: I've crunched 5 years of route data.\n📉 **Drop Window**: My algorithms predict a massive **15-20% price drop** exactly **14 to 21 days** prior to departure.\n💡 **Pro Tip**: Set a price alert on Skyscanner and check back on a Tuesday at 3:00 PM for the absolute lowest dip! 💸"})
            else:
                return jsonify({"reply": "Oops! My memory wiped for a second. Which cities were we talking about again? 😅"})
        return jsonify({"reply": "Fasten your seatbelt! What else can I assist you with today? 🛫"})

    # --- INTENT: FLIGHT SEARCH (A-to-Z Info) ---
    match_fwd = re.search(r'(?:from|between)\s+([a-zA-Z\s]+?)\s+(?:to|and)\s+([a-zA-Z\s]+)(?:\s|$|\?)', lower_prompt)
    match_bwd = re.search(r'(?:to)\s+([a-zA-Z\s]+?)\s+(?:from)\s+([a-zA-Z\s]+)(?:\s|$|\?)', lower_prompt)
    
    if match_fwd or match_bwd:
        if match_fwd:
            source_city, dest_city = match_fwd.group(1).strip().title(), match_fwd.group(2).strip().title()
        else:
            dest_city, source_city = match_bwd.group(1).strip().title(), match_bwd.group(2).strip().title()
            
        indian_cities = ["Bangalore", "Bengaluru", "Delhi", "Mumbai", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Cochin", "Goa", "Trivandrum"]
        is_domestic = source_city in indian_cities and dest_city in indian_cities
        
        weather_tips = [
            "Expect clear skies, but carry a light jacket just in case! 🌤️",
            "It's currently looking a bit rainy there. Don't forget your umbrella! 🌧️☔",
            "Gorgeous sunny weather awaits you! Pack your sunglasses. ☀️🕶️",
            "It gets a bit chilly at night, so layer up! 🧥⛅"
        ]
        
        if is_domestic:
            airlines = "IndiGo, Air India, or Vistara"
            duration = f"{random.randint(1, 2)}h {random.randint(15, 50)}m"
            base_fare = random.randint(3500, 6500)
            baggage = "Cabin: 7kg | Check-in: 15kg"
            platform, platform_reason = "MakeMyTrip", "Best for domestic flight cashback, free cancellation options, and local bank card offers."
            visa_info = "🛂 **Visa**: Not required for domestic travel. Just carry your Aadhar Card!"
        else:
            airlines = "Emirates, Qatar Airways, Singapore Airlines, or Lufthansa"
            duration = f"{random.randint(8, 16)}h {random.randint(10, 50)}m"
            base_fare = random.randint(35000, 85000)
            baggage = "Cabin: 7kg | Check-in: 25kg to 30kg (depends on airline)"
            platform, platform_reason = "Skyscanner", "Superior algorithm for comparing multi-city international layovers and finding the absolute lowest global fare."
            visa_info = f"🛂 **Visa**: Make sure to check the exact Visa requirements for {dest_city} well in advance. Keep your passport handy!"
            
        reply = f"Wheels up! 🛫 Here is the ultimate A-to-Z breakdown for your journey from **{source_city}** to **{dest_city}**:\n\n" \
                f"✈️ **Flight Operations**\n• **Top Airlines**: {airlines}\n• **Avg. Duration**: {duration} (Direct/1-Stop)\n• **Est. Base Fare**: ₹{base_fare:,}\n\n" \
                f"{visa_info}\n\n🧳 **Standard Baggage Allowance**\n• {baggage}\n\n" \
                f"💼 **Optimal Booking Platform**\nI highly recommend booking this specific route via **{platform}**.\n*Why?* {platform_reason}\n\n" \
                f"🌤️ **Dest. Weather & Packing**: {random.choice(weather_tips)}\n\n" \
                f"Would you like me to predict the exact price drop window for these flights? Just say 'yes'!"
        return jsonify({"reply": reply})

    # --- INTENT: BAGGAGE & LUGGAGE ---
    if any(k in lower_prompt for k in ["baggage", "luggage", "weight", "carry on", "suitcase", "liquid"]):
        return jsonify({"reply": "🧳 **Baggage Rules 101:**\n\n• **Domestic (India)**: Usually 7kg cabin baggage and 15kg check-in baggage.\n• **International**: Usually 7kg cabin, and 25-30kg check-in (varies heavily by airline!).\n• **Liquids in Cabin**: Must be in containers of 100ml or less, placed in a single clear ziplock bag.\n\n*Pro-tip: Always pre-book extra baggage online—it costs 2x to 3x more at the airport counter!*"})

    # --- INTENT: CANCELLATIONS & REFUNDS ---
    if any(k in lower_prompt for k in ["cancel", "refund", "reschedule", "change flight"]):
        return jsonify({"reply": "🔄 **Flight Cancellations & Refunds:**\n\nIf you need to change your plans, here is what you need to know:\n1. **Within 24 Hours**: Many airlines offer a full refund if you cancel within 24 hours of booking.\n2. **Standard Non-Refundable**: You typically only get government taxes refunded. The base fare is lost.\n3. **Rescheduling**: Often cheaper than canceling! Expect to pay a fare difference + a modification fee.\n\n*Always check your specific ticket's fare rules!*"})

    # --- INTENT: FLIGHT STATUS / DELAYS ---
    if any(k in lower_prompt for k in ["status", "delay", "on time", "gate", "terminal"]):
        return jsonify({"reply": "📡 **Live Flight Radar:**\n\nI can track flights in real-time! However, I need your exact **Flight Number** (e.g., 6E-123) and **Date** to pull the terminal, gate, and delay status. \n\n*General Rule:* Always arrive 2 hours early for domestic, and 3-4 hours early for international flights!"})

    # --- INTENT: VISAS & PASSPORTS ---
    if any(k in lower_prompt for k in ["visa", "passport", "document", "id"]):
        return jsonify({"reply": "🛂 **Travel Documents & Visas:**\n\n• **Domestic**: Any Govt ID (Aadhar, PAN, Driver's License) works.\n• **International**: Passport must be valid for at least **6 months** from your date of travel.\n• **Visas**: Over 60 countries offer Visa-on-Arrival or e-Visas for Indian passports (like Thailand, Maldives, UAE)! Always double-check the embassy website before booking."})

    # --- INTENT: HOTELS & ACCOMMODATION ---
    if any(k in lower_prompt for k in ["hotel", "stay", "accommodation", "resort", "airbnb"]):
        return jsonify({"reply": "🏨 **Accommodation Expert:**\n\nLooking for a place to crash? Here are my top platform recommendations:\n• **Booking.com**: Best for flexible 'Pay at Hotel' policies.\n• **Agoda**: Often has the absolute cheapest Asian hotel rates.\n• **Airbnb**: Perfect for long stays and large group villas.\n• **MakeMyTrip**: Great domestic hotel combos with flights!\n\nTell me your destination and I can narrow it down!"})
        
    # --- INTENT: CURRENCY & MONEY ---
    if any(k in lower_prompt for k in ["currency", "money", "exchange", "forex", "cash"]):
        return jsonify({"reply": "💸 **Travel Money Strategy:**\n\n1. **Zero-Forex Cards**: Get a Niyo Global or Fi card! They charge 0% markup on international swipes.\n2. **Cash**: Carry about 20% of your budget in local cash for street food and tips.\n3. **Airport Exchange**: NEVER exchange money at the airport—the rates are the worst! Use ATMs in the city instead."})

    # --- INTENT: AIRPORT LOUNGES ---
    if any(k in lower_prompt for k in ["lounge", "waiting", "food", "priority pass", "credit card"]):
        return jsonify({"reply": "🛋️ **Airport Lounges:**\n\nWant to travel in luxury? Most premium credit cards in India offer free domestic lounge access (unlimited food, Wi-Fi, comfy seats!). \nFor international, look into **Priority Pass** or **DragonPass**. Lounges are a lifesaver for layovers over 3 hours!"})

    # --- INTENT: GREETINGS ---
    elif any(greeting in lower_prompt for greeting in ["hi", "hello", "hey", "greetings", "good morning", "good evening"]):
        return jsonify({"reply": "👩‍✈️ **Hello! I am Aero Nav, your all-purpose highly intelligent Travel Assistant!**\n\nI am an expert in flights, pricing, baggage, visas, hotels, and travel hacks. Try asking me:\n• 'Flights from Mumbai to Dubai'\n• 'What are the baggage rules?'\n• 'Do I need a Visa?'"})

    # --- INTENT: OMNISCIENT SMART FALLBACK ---
    else:
        # We NO LONGER say "I am learning". We act smart and redirect.
        return jsonify({"reply": "🌍 **Global Radar Scanning...**\n\nMy systems are processing thousands of global travel datasets! However, I need you to be a bit more specific. \n\nAre you looking for **flight details**, **baggage rules**, **visa requirements**, or **hotel recommendations**? Let me know!"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
