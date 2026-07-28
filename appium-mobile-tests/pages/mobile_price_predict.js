const MobileBasePage = require('./mobile_base_page');

class MobilePricePredictPage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.PREDICT_FROM = 'predict_from';
        this.PREDICT_TO = 'predict_to';
        this.RUN_PREDICT_BTN = 'button_run_predict';
        this.ALERT_PRICE_INPUT = 'input_alert_price';
        this.REGISTER_ALERT_BTN = 'button_register_alert';
    }

    async runPredict(from, to) {
        await this.setValue(this.PREDICT_FROM, from);
        await this.setValue(this.PREDICT_TO, to);
        await this.click(this.RUN_PREDICT_BTN);
    }

    async registerAlert(amount) {
        await this.setValue(this.ALERT_PRICE_INPUT, amount);
        await this.click(this.REGISTER_ALERT_BTN);
    }
}

module.exports = MobilePricePredictPage;
