const { By, until } = require('selenium-webdriver');

class AiChatWidgetPage {
    constructor(driver) {
        this.driver = driver;
        this.toggleBtn = By.css('.chat-toggle-btn');
        this.chatWindow = By.id('chat-window');
        this.closeBtn = By.css('.chat-header .chat-close-btn');
        this.chatInput = By.id('chat-input');
        this.sendBtn = By.css('.chat-input-area button');
        this.chatMessages = By.id('chat-messages');
    }

    async toggleChat() {
        const btn = await this.driver.wait(until.elementLocated(this.toggleBtn), 5000);
        await btn.click();
        await this.driver.sleep(500);
    }

    async isChatWindowOpen() {
        const win = await this.driver.findElement(this.chatWindow);
        const display = await win.getCssValue('display');
        return display !== 'none' && display !== '';
    }

    async sendQuery(queryText) {
        if (!await this.isChatWindowOpen()) {
            await this.toggleChat();
        }
        const input = await this.driver.wait(until.elementLocated(this.chatInput), 5000);
        await input.clear();
        await input.sendKeys(queryText);
        const btn = await this.driver.findElement(this.sendBtn);
        await btn.click();
        await this.driver.sleep(1500);
    }

    async getMessagesText() {
        const elem = await this.driver.findElement(this.chatMessages);
        return await elem.getText();
    }
}

module.exports = AiChatWidgetPage;
