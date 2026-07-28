const MobileBasePage = require('./mobile_base_page');

class MobileGpsSharingPage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.GPS_SWITCH = 'switch_gps_sharing';
        this.COPY_LINK_BTN = 'button_copy_gps_link';
    }

    async toggleGps() { await this.click(this.GPS_SWITCH); }
    async copyLink() { await this.click(this.COPY_LINK_BTN); }
}

module.exports = MobileGpsSharingPage;
