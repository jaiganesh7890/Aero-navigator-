const { By, until } = require('selenium-webdriver');

class DailyActivityPage {
    constructor(driver) {
        this.driver = driver;
        this.statSearches = By.id('daily-stat-searches');
        this.statChats = By.id('daily-stat-chats');
        this.statRecords = By.id('daily-stat-records');
        this.topRoutesList = By.id('top-routes-list');
        this.aiTopicsList = By.id('ai-topics-list');
        this.historyList = By.id('daily-history-list');
        this.exportCsvBtn = By.css('button[onclick="exportDailyActivityCsv()"]');
        this.runMaintenanceBtn = By.css('button[onclick="triggerDbMaintenance()"]');
        this.clearLogsBtn = By.css('button[onclick="clearDailyHistory()"]');
    }

    async getStatCounters() {
        const searches = await (await this.driver.wait(until.elementLocated(this.statSearches), 5000)).getText();
        const chats = await (await this.driver.findElement(this.statChats)).getText();
        const records = await (await this.driver.findElement(this.statRecords)).getText();
        return { searches, chats, records };
    }

    async clickExportCsv() {
        const btn = await this.driver.wait(until.elementLocated(this.exportCsvBtn), 5000);
        await btn.click();
        await this.driver.sleep(500);
    }

    async clickRunMaintenance() {
        const btn = await this.driver.wait(until.elementLocated(this.runMaintenanceBtn), 5000);
        await btn.click();
        await this.driver.sleep(500);
    }

    async clickClearLogs() {
        const btn = await this.driver.wait(until.elementLocated(this.clearLogsBtn), 5000);
        await btn.click();
        await this.driver.sleep(800);
    }
}

module.exports = DailyActivityPage;
