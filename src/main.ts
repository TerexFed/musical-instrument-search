import { PuppeteerCrawler } from 'crawlee';
import * as cheerio from 'cheerio';

export const runCrawler = async (userInput: string, session: any, eventEmitter: any) => {
    console.log(`You want to find - ${userInput}`);
    const userInputWords = userInput.split(' ')

    const siteConfigs = {
        "https://www.muztorg.ru": {
            url: `https://www.muztorg.ru/search/${userInput.replaceAll(' ', '%20')}`,
            selectors: {
                productsSelector: '.catalog-listing',
                productSelector: '.catalog-card',
                productTextSelector: '.catalog-card__info > .catalog-card__name',
                productPriceSelector: '.catalog-card__price',
                productLinkSelector: '.catalog-card__main > .catalog-card__link',
            }
        },
        "https://gitaraclub.ru": {
            url: `https://gitaraclub.ru/search/?q=${userInput.replaceAll(' ', '+')}`,
            selectors: {
                productsSelector: '.catalogList',
                productSelector: '.catalogEl',
                productTextSelector: '.catalogElContent > .catalogElTitle',
                productPriceSelector: '.catalogElContent > .catalogElPrice',
                productLinkSelector: '.catalogElImg',
            }
        },
        "https://skifmusic.ru": {
            url: `https://skifmusic.ru/search/${userInput.replaceAll(' ', '+')}`,
            selectors: {
                productsSelector: 'div.cards-list',
                productSelector: 'div.product-card',
                productTextSelector: '.product-card__info-block > a',
                productPriceSelector: '.product-card__price',
                productLinkSelector: '.product-card__info-block > a',
            }
        },
        "https://pop-music.ru": {
            url: `https://pop-music.ru/search/?q=${userInput.replaceAll(' ', '+')}`,
            selectors: {
                productsSelector: 'div.products-grid',
                productSelector: '.products-grid__i > div.product-card',
                productTextSelector: '.product-card__name',
                productPriceSelector: '.product-card__price',
                productLinkSelector: '.product-card__name',
            }
        },
        "https://jazz-shop.ru": {
            url: `https://jazz-shop.ru/search?search=${userInput.replaceAll(' ', '+')}`,
            selectors: {
                productsSelector: 'div.catalog-products',
                productSelector: 'div.product-trumb',
                productTextSelector: 'div.product-trumb-name > a > span',
                productPriceSelector: 'div.product-trumb-price > div.price-product > div.price-block',
                productLinkSelector: 'div.product-trumb-name > a',
            }
        },
        "https://www.dj-store.ru": {
            url: `https://www.dj-store.ru/search/?q=${userInput.replaceAll(' ', '+')}`,
            selectors: {
                productsSelector: '#cat-items',
                productSelector: 'div.product_item',
                productTextSelector: 'div.list-center > div > a',
                productPriceSelector: 'div.list-right > div.list-right-wrapper > p.price',
                productLinkSelector: 'a.img',
            }
        },
    };

    const results: Array<{ website: string; productName: string; productPrice: string, productLink: string, error?: string }> = [];

    const crawler = new PuppeteerCrawler({
        launchContext: {
            launchOptions: {
                headless: true,
                args: ['--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--dns-prefetch-disable',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-extensions',
                    '--disable-dev-shm-usage',],
            },
        },
        requestHandler: async ({ page, request }) => {
            request.noRetry = true

            console.log(`Processing ${request.url}`);

            const selectors = request.userData?.selectors;

            if (!selectors) {
                console.error(`No selectors found for ${request.url}`);
                return;
            }

            const { productsSelector, productSelector, productTextSelector, productPriceSelector, productLinkSelector } = selectors;

            const baseUrl: string = request.url.split('/search')[0]


            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'stylesheet', 'font', 'media', 'xhr', 'manifest', 'script'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.setJavaScriptEnabled(false)
            await page.setCacheEnabled(false)
            await page.goto(request.url, { waitUntil: 'domcontentloaded' })

            try {
                await page.waitForSelector(productsSelector, { timeout: 5000 });
            } catch (err) {
                console.log(`No products found on ${request.url}. Skipping this website.`);
                return;
            }

            const productsHTML = await page.$eval(productsSelector, (el) => el.innerHTML);
            if (!productsHTML || productsHTML.trim().length === 0) {
                console.log(`No product data found for ${request.url}. Skipping.`);
                request.noRetry
                return;
            }

            const $ = cheerio.load(productsHTML);

            let foundProducts = false;


            $(productSelector).each((_, el) => {
                const productName = $(el).find(productTextSelector).text().trim();

                const productPrice = $(el).find(productPriceSelector).text().trim();

                const productLink = $(el).find(productLinkSelector).attr('href');



                if (productName && productPrice) {
                    const productNameWords = productName.toLowerCase().split(' ')

                    if (userInputWords.every((wordUI) => productNameWords.some((wordPN) => wordPN.includes(wordUI)))) {
                        foundProducts = true
                        
                        const result = {
                            website: baseUrl,
                            productName,
                            productPrice,
                            productLink: request.url.includes('skifmusic') || request.url.includes('jazz-shop') ? productLink! : baseUrl + productLink,
                        };


                        eventEmitter.emit('newResult', result);

                        console.log(`Sending result to session ID: ${session.id}`, result);
                    }
                }
            });
            if (!foundProducts) {
                console.log(`No matching products found for ${request.url}.`);
            }


        },
        failedRequestHandler: async ({ request }) => {
            console.error(`Request failed: ${request.url}`);
        },
    });

    for (const [url, config] of Object.entries(siteConfigs)) {
        await crawler.addRequests([
            {
                url: config.url,
                userData: { selectors: config.selectors },
            },
        ]);
    }

    await crawler.run();
    eventEmitter.emit('done')
    return results;
};
