const { By, until } = require('selenium-webdriver');

class AuthModalPage {
    constructor(driver) {
        this.driver = driver;
        this.modalOverlay = By.id('auth-modal');
        this.emailInput = By.id('auth-email-input');
        this.submitButton = By.css('#auth-form button[type="submit"]');
        this.closeButton = By.css('#auth-modal .chat-close-btn');
        this.userDisplayEmail = By.id('user-display-email');
        this.switchAccountButton = By.css('.sidebar-footerUser button');
    }

    async openModal() {
        const btn = await this.driver.wait(until.elementLocated(this.switchAccountButton), 5000);
        await btn.click();
        await this.driver.sleep(500);
    }

    async isModalVisible() {
        const modal = await this.driver.findElement(this.modalOverlay);
        const display = await modal.getCssValue('display');
        return display !== 'none';
    }

    async signInWithEmail(email) {
        if (!await this.isModalVisible()) {
            await this.openModal();
        }
        const input = await this.driver.wait(until.elementLocated(this.emailInput), 5000);
        await input.clear();
        await input.sendKeys(email);
        const submit = await this.driver.findElement(this.submitButton);
        await submit.click();
        await this.driver.sleep(1000);
    }

    async getLoggedUserEmail() {
        const elem = await this.driver.wait(until.elementLocated(this.userDisplayEmail), 5000);
        return await elem.getText();
    }

    async closeModal() {
        if (await this.isModalVisible()) {
            const btn = await this.driver.findElement(this.closeButton);
            await btn.click();
            await this.driver.sleep(500);
        }
    }
}

module.exports = AuthModalPage;
