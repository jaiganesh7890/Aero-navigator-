const MobileBasePage = require('./mobile_base_page');

class MobileDashboardPage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.CARD_FLIGHT_SEARCH = 'card_flight_search';
        this.CARD_FLIGHT_TRACKING = 'card_flight_tracking';
        this.CARD_PRICE_PREDICTION = 'card_price_prediction';
        this.CARD_ROUTE_OPTIMIZER = 'card_route_optimizer';
        this.CARD_GPS_SHARING = 'card_gps_sharing';
        this.BTN_AI_COPILOT = 'button_ai_copilot';
        this.BTN_PROFILE = 'button_profile';
    }

    async openFlightSearch() { await this.click(this.CARD_FLIGHT_SEARCH); }
    async openFlightTracking() { await this.click(this.CARD_FLIGHT_TRACKING); }
    async openPricePrediction() { await this.click(this.CARD_PRICE_PREDICTION); }
    async openRouteOptimizer() { await this.click(this.CARD_ROUTE_OPTIMIZER); }
    async openGpsSharing() { await this.click(this.CARD_GPS_SHARING); }
    async openAiChat() { await this.click(this.BTN_AI_COPILOT); }
    async openProfile() { await this.click(this.BTN_PROFILE); }
}

module.exports = MobileDashboardPage;
