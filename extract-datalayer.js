const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Get the URL from the command line arguments
const url = process.argv[2];

if (!url) {
    console.error('Please provide a URL as a command line argument.');
    process.exit(1);
}

(async () => {
    const browser = await puppeteer.launch({ headless: false }); // Set headless: true to run in headless mode
    const page = await browser.newPage();

    // Set viewport to full desktop width
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the provided URL
    await page.goto(url);

    // Scroll the page to capture all dynamic content
    await autoScroll(page);

    // Wait for a few seconds to allow dataLayer to be fully populated
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Click all links on the page to trigger 'moduleInteraction' events
    await clickAllLinks(page);

    // Wait for a few seconds to ensure all 'moduleInteraction' events are captured
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract the module values from the dataLayer filtered by 'impression' and 'moduleInteraction'
    const moduleValues = await page.evaluate(() => {
        function extractFilteredModuleValues(payloadKey, filterKeywords) {
            if (!window.dataLayer || !Array.isArray(window.dataLayer)) {
                console.error('dataLayer is not defined or not an array');
                return [];
            }

            const filteredEntries = window.dataLayer
                .filter(entry => 
                    entry.hasOwnProperty(payloadKey) && 
                    filterKeywords.some(keyword => entry.event && entry.event.includes(keyword))
                )
                .map(entry => {
                    const flatModule = flattenObject(entry[payloadKey], payloadKey);

                    // Extract module.element.name and module.element.label if they exist
                    if (entry.event === 'moduleInteraction') {
                        if (entry[payloadKey] && entry[payloadKey].element) {
                            flatModule[`${payloadKey}_element_name`] = entry[payloadKey].element.name || '';
                            flatModule[`${payloadKey}_element_label`] = entry[payloadKey].element.label || '';
                            flatModule[`${payloadKey}_element_url`] = entry[payloadKey].element.url || '';
                        }
                    }

                    return {
                        event: entry.event,
                        ...flatModule
                    };
                });

            return filteredEntries;
        }

        function flattenObject(ob, prefix) {
            const toReturn = {};

            for (const i in ob) {
                if (!ob.hasOwnProperty(i)) continue;

                const key = prefix ? `${prefix}_${i}` : i;

                if ((typeof ob[i]) === 'object' && ob[i] !== null) {
                    const flatObject = flattenObject(ob[i], key);
                    for (const x in flatObject) {
                        if (!flatObject.hasOwnProperty(x)) continue;

                        toReturn[x] = flatObject[x];
                    }
                } else {
                    toReturn[key] = ob[i];
                }
            }
            return toReturn;
        }

        const payloadKey = 'module';
        const filterKeywords = ['impression', 'moduleInteraction'];
        const values = extractFilteredModuleValues(payloadKey, filterKeywords);

        return values;
    });

    // Ensure all keys are included in the records
    const allKeys = new Set();
    moduleValues.forEach(entry => {
        Object.keys(entry).forEach(key => allKeys.add(key));
    });
    const allKeysArray = Array.from(allKeys);

    // Prepare records with all keys
    const records = moduleValues.map((entry, index) => {
        const record = { index: index + 1 };
        allKeysArray.forEach(key => {
            record[key] = entry[key] || '';
        });
        return record;
    });

    // Log records for debugging
    console.log('CSV Records:', records);

    // Define the CSV writer with dynamic headers
    const headers = [
        { id: 'index', title: 'Index' },
        ...allKeysArray.map(key => ({ id: key, title: key }))
    ];

    // Log headers for debugging
    console.log('CSV Headers:', headers);

    const csvWriter = createCsvWriter({
        path: 'extracted_data.csv',
        header: headers
    });

    // Write data to CSV
    await csvWriter.writeRecords(records);

    console.log('Data saved to extracted_data.csv');

    await browser.close();
})();

// Function to auto scroll the page
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

// Function to click all links on the page without navigating away
async function clickAllLinks(page) {
    await page.evaluate(async () => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
            link.addEventListener('click', (event) => event.preventDefault());
            link.click();
            // Wait a bit after each click to allow interaction events to be captured
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    });
}
