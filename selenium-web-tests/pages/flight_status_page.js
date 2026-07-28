const { By, until } = require('selenium-webdriver');

class FlightStatusPage {
    constructor(driver) {
        this.driver = driver;
        this.fromInput = By.id('flight-from');
        this.toInput = By.id('flight-to');
        this.dateInput = By.id('flight-date');
        this.searchButton = By.css('#tab-flight-status .search-box button');
        this.resultsContainer = By.id('flight-results-container');
        this.aiInsightsPanel = By.id('ai-insights-panel');
        this.weatherContent = By.id('weather-content');
        this.sentimentContent = By.id('sentiment-content');
    }

    async searchRoute(from, to, date = '2026-08-01') {
        const fromElem = await this.driver.wait(until.elementLocated(this.fromInput), 5000);
        await fromElem.clear();
        await fromElem.sendKeys(from);

        const toElem = await this.driver.findElement(this.toInput);
        await toElem.clear();
        await toElem.sendKeys(to);

        const dateElem = await this.driver.findElement(this.dateInput);
        await dateElem.sendKeys(date);

        const btn = await this.driver.findElement(this.searchButton);
        await btn.click();
        await this.driver.sleep(1500);
    }

    async isResultsDisplayed() {
        const container = await this.driver.findElement(this.resultsContainer);
        const display = await container.getCssValue('display');
        return display !== 'none';
    }

    async isAiInsightsDisplayed() {
        const panel = await this.driver.findElement(this.aiInsightsPanel);
        const display = await panel.getCssValue('display');
        return display !== 'none';
    }

    async getWeatherText() {
        const elem = await this.driver.findElement(this.weatherContent);
        return await elem.getText();
    }

    async getSentimentText() {
        const elem = await this.driver.findElement(this.sentimentContent);
        return await elem.getText();
    }
}

module.exports = FlightStatusPage;
