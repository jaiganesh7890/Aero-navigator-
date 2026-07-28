const { By, until } = require('selenium-webdriver');

class SettingsPage {
    constructor(driver) {
        this.driver = driver;
        this.usernameInput = By.id('settings-username');
        this.syncFrequencySelect = By.id('sync-frequency');
        this.saveRulesBtn = By.css('#tab-settings .card button');
    }

    async getUsername() {
        const input = await this.driver.wait(until.elementLocated(this.usernameInput), 5000);
        return await input.getAttribute('value');
    }

    async selectSyncFrequency(val) {
        const select = await this.driver.wait(until.elementLocated(this.syncFrequencySelect), 5000);
        await select.sendKeys(val);
        await this.driver.sleep(300);
    }

    async clickSaveRules() {
        const btn = await this.driver.findElement(this.saveRulesBtn);
        await btn.click();
        await this.driver.sleep(500);
    }
}

module.exports = SettingsPage;
