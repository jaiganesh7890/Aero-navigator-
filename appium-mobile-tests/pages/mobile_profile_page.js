const MobileBasePage = require('./mobile_base_page');

class MobileProfilePage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.BTN_ACTIVITY = 'button_daily_activity';
        this.BTN_ADMIN_HUB = 'button_admin_hub';
        this.BTN_LOGOUT = 'button_logout';
    }

    async openDailyActivity() { await this.click(this.BTN_ACTIVITY); }
    async openAdminHub() { await this.click(this.BTN_ADMIN_HUB); }
    async logout() { await this.click(this.BTN_LOGOUT); }
}

module.exports = MobileProfilePage;
