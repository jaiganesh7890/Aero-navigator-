const { By, until } = require('selenium-webdriver');

class DashboardPage {
    constructor(driver) {
        this.driver = driver;
        this.brandLogo = By.css('.brand .logo-icon');
        this.startTrackingBtn = By.css('#tab-dashboard .hero-content button');
        this.navItems = {
            dashboard: By.css('button[data-tab="dashboard"]'),
            flightStatus: By.css('button[data-tab="flight-status"]'),
            pricePredict: By.css('button[data-tab="price-predict"]'),
            optimizeRoute: By.css('button[data-tab="optimize-route"]'),
            shareGps: By.css('button[data-tab="share-gps"]'),
            dailyActivity: By.css('button[data-tab="daily-activity"]'),
            settings: By.css('button[data-tab="settings"]')
        };
    }

    async switchTab(tabKey) {
        const locator = this.navItems[tabKey];
        if (!locator) throw new Error(`Unknown tab key: ${tabKey}`);
        const btn = await this.driver.wait(until.elementLocated(locator), 5000);
        await btn.click();
        await this.driver.sleep(500);
    }

    async getActiveTabId() {
        const activeSection = await this.driver.findElement(By.css('.dashboard-section.active'));
        return await activeSection.getAttribute('id');
    }

    async clickStartTrackingHero() {
        const btn = await this.driver.wait(until.elementLocated(this.startTrackingBtn), 5000);
        await btn.click();
        await this.driver.sleep(500);
    }
}

module.exports = DashboardPage;
