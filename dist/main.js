// import {KeyValueStore, PlaywrightCrawler} from 'crawlee';
//
// let userInput = ''
//
// await KeyValueStore.getInput().then(res => userInput = res)
//
// console.log(`You want to find - ${userInput.search}`)
//
// const crawler = new PlaywrightCrawler({
//     requestHandler: async ({page, pushData, request}) => {
//         console.log(`Processing ${page.url()}`)
//
//         let productsSelector = ''
//         let productSelector = ''
//         let productTextSelector = ''
//         let productPriceSelector = ''
//
//         if(request.uniqueKey.includes('muztorg')){
//              productsSelector = '.catalog-listing'
//              productSelector = '.catalog-card'
//              productTextSelector = '.catalog-card__info > .catalog-card__name'
//              productPriceSelector = '.catalog-card__price'
//         }
//         else if(request.uniqueKey.includes('gitaraclub')) {
//
//              productsSelector = '.catalogList'
//              productSelector = '.catalogEl'
//              productTextSelector = '.catalogElContent > .catalogElTitle'
//              productPriceSelector = '.catalogElContent > .catalogElPrice'
//         }
//
//             const products = await page.waitForSelector(productsSelector)
//
//             const product = await products.waitForSelector(productSelector)
//
//             const productText = await product.waitForSelector(productTextSelector)
//             const productPrice = await product.waitForSelector(productPriceSelector)
//
//             const productTextData = await productText.textContent()
//             const productPriceData = await productPrice.textContent()
//
//             await pushData({
//                 'productName': productTextData?.trim(),
//                 'productPrice': productPriceData?.trim()
//             })
//
//         }
//
// })
//
//
// await crawler.run([`https://www.muztorg.ru/search/${userInput.search}`, `https://gitaraclub.ru/search/?q=${userInput.search}`])
import { PlaywrightCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
export const runCrawler = async (userInput) => {
    console.log(`You want to find - ${userInput}`);
    const siteConfigs = {
        'muztorg': {
            url: `https://www.muztorg.ru/search/${userInput}`,
            selectors: {
                productsSelector: '.catalog-listing',
                productSelector: '.catalog-card',
                productTextSelector: '.catalog-card__info > .catalog-card__name',
                productPriceSelector: '.catalog-card__price',
                productLinkSelector: '.catalog-card__main > .catalog-card__link',
            }
        },
        'gitaraclub': {
            url: `https://gitaraclub.ru/search/?q=${userInput}`,
            selectors: {
                productsSelector: '.catalogList',
                productSelector: '.catalogEl',
                productTextSelector: '.catalogElContent > .catalogElTitle',
                productPriceSelector: '.catalogElContent > .catalogElPrice',
                productLinkSelector: '.catalogElImg',
            }
        }
    };
    const urls = Object.values(siteConfigs).map(config => config.url);
    const results = [];
    const crawler = new PlaywrightCrawler({
        requestHandler: async ({ page, request }) => {
            console.log(`Processing ${request.url}`);
            const basePath = request.url.split('/search')[0];
            const siteConfig = Object.values(siteConfigs).find(config => request.url.startsWith(config.url.split('?')[0]));
            if (!siteConfig) {
                console.log(`No configuration found for ${request.url}`);
                return;
            }
            const { productsSelector, productSelector, productTextSelector, productPriceSelector, productLinkSelector } = siteConfig.selectors;
            const html = await page.content();
            const $ = cheerio.load(html);
            $(productsSelector).find(productSelector).each((_, element) => {
                const productName = $(element).find(productTextSelector).text().trim();
                const productPrice = $(element).find(productPriceSelector).text().trim();
                const productLink = $(element).find(productLinkSelector).attr('href');
                if (productName && productPrice) {
                    results.push({
                        website: basePath,
                        productLink: basePath + productLink,
                        productName,
                        productPrice,
                    });
                }
            });
        }
    });
    await crawler.run(urls);
    return results;
};
//# sourceMappingURL=main.js.map