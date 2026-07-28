const MobileBasePage = require('./mobile_base_page');

class MobileFlightSearchPage extends MobileBasePage {
    constructor(driver) {
        super(driver);
        this.FROM_INPUT = 'input_from_city';
        this.TO_INPUT = 'input_to_city';
        this.SEARCH_BTN = 'button_search_flights';
        this.FLIGHT_RESULTS_LIST = 'list_flight_results';
    }

    async searchFlights(from, to) {
        await this.setValue(this.FROM_INPUT, from);
        await this.setValue(this.TO_INPUT, to);
        await this.click(this.SEARCH_BTN);
    }
}

module.exports = MobileFlightSearchPage;
