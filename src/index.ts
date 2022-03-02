import puppeteer, { BoundingBox, Browser } from 'puppeteer'
import { getLogs } from './log'
import { login } from './login'
import { init, env } from './env'

async function run(browser:Browser) {
  const page = await browser.newPage();
  await login(page);
  
  await getLogs(page);
}


(async () => {
  let retry = 10;
  await init();
  console.log(env);

  while (retry) {
    const browser = await puppeteer.launch({
      headless: env.headless,
      defaultViewport:{width:1920,height:1080}
    });
    try {
      await run(browser)
      break;
    } catch (err) {
      console.error(err);
      console.log(`retry count:${retry}`);
      retry--;
    } finally {
      await browser.close()
    }
  };

})()




