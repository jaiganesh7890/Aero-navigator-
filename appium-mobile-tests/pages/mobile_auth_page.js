const MobileBasePage = require('./mobile_base_page');

class MobileAuthPage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.EMAIL_INPUT = 'email_input';
        this.PASSWORD_INPUT = 'password_input';
        this.LOGIN_BTN = 'login_button';
        this.SIGNUP_LINK = 'signup_link';
        this.FULLNAME_INPUT = 'fullname_input';
        this.SIGNUP_SUBMIT_BTN = 'signup_submit_button';
    }

    async login(email, password) {
        await this.setValue(this.EMAIL_INPUT, email);
        await this.setValue(this.PASSWORD_INPUT, password);
        await this.click(this.LOGIN_BTN);
    }

    async signup(fullname, email, password) {
        await this.click(this.SIGNUP_LINK);
        await this.setValue(this.FULLNAME_INPUT, fullname);
        await this.setValue(this.EMAIL_INPUT, email);
        await this.setValue(this.PASSWORD_INPUT, password);
        await this.click(this.SIGNUP_SUBMIT_BTN);
    }
}

module.exports = MobileAuthPage;
