const MobileBasePage = require('./mobile_base_page');

class MobileAiChatPage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.CHAT_INPUT = 'chat_input';
        this.SEND_BTN = 'button_send_chat';
    }

    async sendMessage(text) {
        await this.setValue(this.CHAT_INPUT, text);
        await this.click(this.SEND_BTN);
    }
}

module.exports = MobileAiChatPage;
