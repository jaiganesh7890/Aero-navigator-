const { By, until } = require('selenium-webdriver');

class RouteOptimizerPage {
    constructor(driver) {
        this.driver = driver;
        this.fromInput = By.id('opt-from');
        this.toInput = By.id('opt-to');
        this.dateInput = By.id('opt-date');
        this.analyzeBtn = By.css('#tab-optimize-route .search-box button');
        this.resultsGrid = By.id('optimization-results');
        this.optionCards = By.css('#optimization-results .card');
    }

    async analyzeOptimization(from, to, date = '2026-09-01') {
        const fromElem = await this.driver.wait(until.elementLocated(this.fromInput), 5000);
        await fromElem.clear();
        await fromElem.sendKeys(from);

        const toElem = await this.driver.findElement(this.toInput);
        await toElem.clear();
        await toElem.sendKeys(to);

        const dateElem = await this.driver.findElement(this.dateInput);
        await dateElem.sendKeys(date);

        const btn = await this.driver.findElement(this.analyzeBtn);
        await btn.click();
        await this.driver.sleep(1500);
    }

    async isResultsDisplayed() {
        const container = await this.driver.findElement(this.resultsGrid);
        const display = await container.getCssValue('display');
        return display !== 'none';
    }

    async getOptionsCount() {
        const cards = await this.driver.findElements(this.optionCards);
        return cards.length;
    }
}

module.exports = RouteOptimizerPage;
