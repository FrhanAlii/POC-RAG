import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Page, Browser, BrowserContext } from 'playwright';

/**
 * CustomWorld extends Cucumber's World to provide shared state
 * across all step definitions during test execution
 */
export class CustomWorld extends World {
    browser?: Browser;
    context?: BrowserContext;
    page?: Page;
    pickle?: any; // Scenario metadata (name, tags, etc.)

    // Amazon-specific state
    searchBox?: any;
    searchedProduct?: string;
    selectedProduct?: { name: string; price: string };
    cartItems?: any[];

    // Test execution result
    testResult?: any;

    constructor(options: IWorldOptions) {
        super(options);
        // Store pickle (scenario metadata) from options
        this.pickle = (options as any).pickle;
    }

    /**
     * Get the current page, throw if not initialized
     */
    getPage(): Page {
        if (!this.page) {
            throw new Error('Page not initialized. Did you run the browser setup step?');
        }
        return this.page;
    }

    /**
     * Store screenshot for debugging
     */
    async takeScreenshot(name: string): Promise<void> {
        if (this.page) {
            await this.page.screenshot({
                path: `artifacts/screenshots/${name}_${Date.now()}.png`,
                fullPage: true
            });
        }
    }
}

setWorldConstructor(CustomWorld);
