const { By, until } = require('selenium-webdriver');

class PricePredictPage {
    constructor(driver) {
        this.driver = driver;
        this.fromInput = By.id('predict-from');
        this.toInput = By.id('predict-to');
        this.dateInput = By.id('predict-date');
        this.predictBtn = By.css('#tab-price-predict .search-box button');
        this.analyticsView = By.id('forecast-analytics-view');
        this.currentPriceDisplay = By.id('current-price-display');
        this.trendDisplay = By.id('price-trend-display');
        this.recommendationBadge = By.id('ai-recommendation');
        this.chartCanvas = By.id('priceForecastChart');
        this.alertPriceInput = By.id('alert-price');
        this.registerAlertBtn = By.css('.alert-setup-row button');
    }

    async generateForecast(from, to, date = '2026-08-15') {
        const fromElem = await this.driver.wait(until.elementLocated(this.fromInput), 5000);
        await fromElem.clear();
        await fromElem.sendKeys(from);

        const toElem = await this.driver.findElement(this.toInput);
        await toElem.clear();
        await toElem.sendKeys(to);

        const dateElem = await this.driver.findElement(this.dateInput);
        await dateElem.sendKeys(date);

        const btn = await this.driver.findElement(this.predictBtn);
        await btn.click();
        await this.driver.sleep(1500);
    }

    async isAnalyticsViewDisplayed() {
        const container = await this.driver.findElement(this.analyticsView);
        const display = await container.getCssValue('display');
        return display !== 'none';
    }

    async getCurrentPriceText() {
        const elem = await this.driver.findElement(this.currentPriceDisplay);
        return await elem.getText();
    }

    async registerAlert(targetAmount = '5000') {
        const input = await this.driver.wait(until.elementLocated(this.alertPriceInput), 5000);
        await input.clear();
        await input.sendKeys(targetAmount);

        const btn = await this.driver.findElement(this.registerAlertBtn);
        await btn.click();
        await this.driver.sleep(800);
    }
}

module.exports = PricePredictPage;
