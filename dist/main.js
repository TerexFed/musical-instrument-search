import { PuppeteerCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
export const runCrawler = async (userInput) => {
    console.log(`You want to find - ${userInput}`);
    const siteConfigs = {
        "https://www.muztorg.ru": {
            url: `https://www.muztorg.ru/search/${userInput}`,
            selectors: {
                productsSelector: '.catalog-listing',
                productSelector: '.catalog-card',
                productTextSelector: '.catalog-card__info > .catalog-card__name',
                productPriceSelector: '.catalog-card__price',
                productLinkSelector: '.catalog-card__main > .catalog-card__link',
            }
        },
        "https://gitaraclub.ru": {
            url: `https://gitaraclub.ru/search/?q=${userInput}`,
            selectors: {
                productsSelector: '.catalogList',
                productSelector: '.catalogEl',
                productTextSelector: '.catalogElContent > .catalogElTitle',
                productPriceSelector: '.catalogElContent > .catalogElPrice',
                productLinkSelector: '.catalogElImg',
            }
        },
        "https://skifmusic.ru": {
            url: `https://skifmusic.ru/search/${userInput.replace(' ', '+')}`,
            selectors: {
                productsSelector: 'div.cards-list',
                productSelector: 'div.product-card',
                productTextSelector: '.product-card__info-block > a',
                productPriceSelector: '.product-card__price',
                productLinkSelector: '.product-card__info-block > a',
            }
        },
        "https://pop-music.ru": {
            url: `https://pop-music.ru/search/?q=${userInput.replace(' ', '+')}`,
            selectors: {
                productsSelector: 'div.products-grid',
                productSelector: '.products-grid__i > div.product-card',
                productTextSelector: '.product-card__name',
                productPriceSelector: '.product-card__price',
                productLinkSelector: '.product-card__name',
            }
        }
    };
    const results = [];
    const urls = Object.values(siteConfigs).map((config) => config.url);
    const crawler = new PuppeteerCrawler({
        maxConcurrency: 5,
        launchContext: {
            launchOptions: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        },
        requestHandler: async ({ page, request }) => {
            console.log(`Processing ${request.url}`);
            const selectors = request.userData?.selectors;
            if (!selectors) {
                console.error(`No selectors found for ${request.url}`);
                return;
            }
            const { productsSelector, productSelector, productTextSelector, productPriceSelector, productLinkSelector } = selectors;
            const baseUrl = request.url.split('/search')[0];
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                    req.abort();
                }
                else {
                    req.continue();
                }
            });
            const html = await page.content();
            const $ = cheerio.load(html);
            $(productsSelector).find(productSelector).each((_, el) => {
                const productName = $(el).find(productTextSelector).text().trim();
                const productPrice = $(el).find(productPriceSelector).text().trim();
                const productLink = $(el).find(productLinkSelector).attr('href');
                if (productName && productPrice) {
                    if (productName.toLowerCase().includes(userInput.toLowerCase())) {
                        results.push({
                            website: baseUrl,
                            productName,
                            productPrice,
                            productLink: baseUrl + productLink,
                        });
                    }
                }
            });
        },
        failedRequestHandler: async ({ request }) => {
            console.error(`Request failed: ${request.url}`);
        },
    });
    for (const [url, config] of Object.entries(siteConfigs)) {
        await crawler.addRequests([
            {
                url: config.url,
                userData: { selectors: config.selectors }, // Ensure selectors are passed
            },
        ]);
    }
    await crawler.run();
    return results;
};
//# sourceMappingURL=main.js.map