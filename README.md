# DataLayer Extractor

This project is a Node.js script that uses Puppeteer to extract and log values from the `dataLayer` of a specified URL, tailored for the Data and Insights Group at the New York Times. The extracted values are saved to a CSV file with unique headers for each attribute, including nested attributes.

## Installation

To install and set up the project, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/mrstepanovic/datalayer-extractor.git
    cd datalayer-extractor
    ```

2. Install the required dependencies:
    ```bash
    npm install puppeteer csv-writer
    ```
## Usage

To run the script and extract dataLayer values from a specified URL, use the following command:

```bash
node extract-datalayer.js <URL you want to analyze>
```

Example:

```bash
node extract-datalayer.js https://www.nytimes.com/subscription/games
```

The script will perform the following actions:

1. Open the specified URL in a Puppeteer-controlled browser.
2. Scroll through the page to capture all dynamic content (impressions).
3. Simulate clicks on all links to trigger 'moduleInteraction' events.
4. Extract values from the dataLayer filtered by 'impression' and 'moduleInteraction' keywords.
5. Save the extracted values to extracted_data.csv in the project directory.

## Contributing
Contributions are welcome! If you have any suggestions or improvements, please open an issue or submit a pull request.

## License
This project is licensed under the MIT License.