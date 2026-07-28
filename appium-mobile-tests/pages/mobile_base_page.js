class MobileBasePage {
    constructor(driver = null) {
        this.driver = driver;
    }

    async findElement(accessibilityId) {
        if (!this.driver) return { accessibilityId, mock: true };
        return await this.driver.$(`~${accessibilityId}`);
    }

    async click(accessibilityId) {
        if (!this.driver) return true;
        const elem = await this.findElement(accessibilityId);
        await elem.click();
    }

    async setValue(accessibilityId, value) {
        if (!this.driver) return true;
        const elem = await this.findElement(accessibilityId);
        await elem.setValue(value);
    }

    async getText(accessibilityId) {
        if (!this.driver) return `[Mock Text for ${accessibilityId}]`;
        const elem = await this.findElement(accessibilityId);
        return await elem.getText();
    }
}

module.exports = MobileBasePage;
