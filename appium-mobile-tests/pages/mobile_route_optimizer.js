const MobileBasePage = require('./mobile_base_page');

class MobileRouteOptimizerPage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.OPT_FROM = 'opt_from';
        this.OPT_TO = 'opt_to';
        this.ANALYZE_BTN = 'button_analyze_optimizer';
    }

    async analyze(from, to) {
        await this.setValue(this.OPT_FROM, from);
        await this.setValue(this.OPT_TO, to);
        await this.click(this.ANALYZE_BTN);
    }
}

module.exports = MobileRouteOptimizerPage;
