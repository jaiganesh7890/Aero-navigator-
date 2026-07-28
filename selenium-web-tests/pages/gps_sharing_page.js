const { By, until } = require('selenium-webdriver');

class GpsSharingPage {
    constructor(driver) {
        this.driver = driver;
        this.shareMap = By.id('share-map');
        this.gpsToggle = By.id('gps-toggle');
        this.linkPayloadBox = By.id('link-payload-display');
        this.generatedLinkInput = By.id('generated-gps-link');
        this.copyLinkBtn = By.css('.share-payload-box button');
    }

    async toggleGpsBroadcast(enable = true) {
        const toggle = await this.driver.wait(until.elementLocated(this.gpsToggle), 5000);
        const isChecked = await toggle.isSelected();
        if (isChecked !== enable) {
            // Click the custom slider label
            const label = await this.driver.findElement(By.css('.slider-switch'));
            await label.click();
            await this.driver.sleep(1200);
        }
    }

    async isPayloadDisplayed() {
        const container = await this.driver.findElement(this.linkPayloadBox);
        const display = await container.getCssValue('display');
        return display !== 'none';
    }

    async getGeneratedLinkValue() {
        const input = await this.driver.findElement(this.generatedLinkInput);
        return await input.getAttribute('value');
    }

    async clickCopyLink() {
        const btn = await this.driver.findElement(this.copyLinkBtn);
        await btn.click();
        await this.driver.sleep(500);
    }
}

module.exports = GpsSharingPage;
