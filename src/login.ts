import puppeteer, { BoundingBox } from 'puppeteer'
import { promises as fs } from "fs";
import jimp from 'jimp'
import pixelmatch from 'pixelmatch'
import { cv } from 'opencv-wasm'
import {env} from './env'

async function findPuzzlePosition (page:puppeteer.Page) {
    let images = await page.$$eval('.geetest_canvas_img canvas', canvases => canvases.map((canvas:any) => canvas.toDataURL().replace(/^data:image\/png;base64,/, '')))

    await fs.writeFile(`./puzzle.png`, images[1], 'base64')

    let srcPuzzleImage = await jimp.read('./puzzle.png')
    let srcPuzzle = cv.matFromImageData(srcPuzzleImage.bitmap)
    let dstPuzzle = new cv.Mat()

    cv.cvtColor(srcPuzzle, srcPuzzle, cv.COLOR_BGR2GRAY)
    cv.threshold(srcPuzzle, dstPuzzle, 127, 255, cv.THRESH_BINARY)

    let kernel = cv.Mat.ones(5, 5, cv.CV_8UC1)
    let anchor = new cv.Point(-1, -1)
    cv.dilate(dstPuzzle, dstPuzzle, kernel, anchor, 1)
    cv.erode(dstPuzzle, dstPuzzle, kernel, anchor, 1)

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(dstPuzzle, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let contour = contours.get(0)
    let moment = cv.moments(contour)

    return [Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00)]
}

async function findDiffPosition (page:puppeteer.Page) {
    await page.waitForTimeout(100)

    let srcImage = await jimp.read('./diff.png')
    let src = cv.matFromImageData(srcImage.bitmap)

    let dst = new cv.Mat()
    let kernel = cv.Mat.ones(5, 5, cv.CV_8UC1)
    let anchor = new cv.Point(-1, -1)

    cv.threshold(src, dst, 127, 255, cv.THRESH_BINARY)
    cv.erode(dst, dst, kernel, anchor, 1)
    cv.dilate(dst, dst, kernel, anchor, 1)
    cv.erode(dst, dst, kernel, anchor, 1)
    cv.dilate(dst, dst, kernel, anchor, 1)

    cv.cvtColor(dst, dst, cv.COLOR_BGR2GRAY)
    cv.threshold(dst, dst, 150, 255, cv.THRESH_BINARY_INV)

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let contour = contours.get(0)
    let moment = cv.moments(contour)

    return [Math.floor(moment.m10 / moment.m00), Math.floor(moment.m01 / moment.m00)]
}

async function saveSliderCaptchaImages(page: puppeteer.Page) { 

  await page.waitForSelector('.geetest_canvas_img canvas', { visible: true });
  await page.waitForTimeout(1000);

  let images = await page.$$eval('.geetest_canvas_img canvas', canvases => {
    return canvases.map((canvas:any) => canvas.toDataURL().replace(/^data:image\/png;base64,/,''))
  })

  await fs.writeFile('./captcha.png', images[0], {encoding:'base64'});
  await fs.writeFile('./original.png', images[2], { encoding: 'base64' });

}

async function saveDiffImage() {
    const originalImage = await jimp.read('./original.png')
    const captchaImage = await jimp.read('./captcha.png')

    const { width, height } = originalImage.bitmap
    const diffImage = new jimp(width, height)

    const diffOptions = { includeAA: true, threshold: 0.2 }

    pixelmatch(originalImage.bitmap.data, captchaImage.bitmap.data, diffImage.bitmap.data, width, height, diffOptions)
    diffImage.write('./diff.png')
}

async function tryCaptcha(page: puppeteer.Page, retry: boolean) {
  const selector = retry ? '.geetest_radar_tip>.geetest_reset_tip_content':'.geetest_radar_tip'
  await page.waitForSelector(selector)
  await page.click(selector);
  await saveSliderCaptchaImages(page);
  await saveDiffImage();

  await page.waitForTimeout(1000);

  let [cx, cy] = await findDiffPosition(page)
  const sliderHandle = await page.$('.geetest_slider_button')
  if (!sliderHandle) {
    console.error('sliderHandle is Null')
    process.exit(1);
    return;
  }
  const handle = await sliderHandle.boundingBox() as BoundingBox;
  let xPosition = handle.x + handle.width / 2
  let yPosition = handle.y + handle.height / 2
  await page.mouse.move(xPosition, yPosition)
  await page.mouse.down()

  xPosition = handle.x + cx - handle.width / 2
  yPosition = handle.y + handle.height / 3
  await page.mouse.move(xPosition, yPosition, { steps: 25 })

  await page.waitForTimeout(100)

  let [cxPuzzle, cyPuzzle] = await findPuzzlePosition(page)

  xPosition = xPosition + cx - cxPuzzle
  yPosition = handle.y + handle.height / 2
  await page.mouse.move(xPosition, yPosition, { steps: 5 })
  await page.mouse.up()

  await page.waitForTimeout(3000)
  // success!

  await fs.unlink('./original.png')
  await fs.unlink('./captcha.png')
  await fs.unlink('./diff.png')
  await fs.unlink('./puzzle.png')

  await page.waitForSelector('.geetest_radar_tip')

  await page.waitForSelector('.geetest_radar_tip>.geetest_radar_tip_content')
  const content = await page.$eval('.geetest_radar_tip>.geetest_radar_tip_content', el => el?.textContent)
  return content !== 'Network failure';
}


export async function login(page: puppeteer.Page) {
  console.log('login start');
  await page.goto('https://account.powerballgame.co.kr/login', { waitUntil: 'networkidle2' });
  
  await page.waitForTimeout(3000);

  await page.waitForSelector('input#id');
  await page.$eval('input#id', (el: any,id) => el.value = id,env.id)
  await page.waitForTimeout(200);

  await page.waitForSelector('input#pw');
  await page.$eval('input#pw', (el:any,password) => el.value = password,env.password)
  await page.waitForTimeout(200);

  let retry = false;
  while (true) {
    const isSuccess = await tryCaptcha(page, retry)
    if (isSuccess) break;
    retry = true;
    await page.waitForTimeout(3200);
  }

  await page.waitForSelector('.btn_login > button[type="submit"]');
  await page.click('.btn_login > button[type="submit"]');
  await page.waitForNavigation();
  console.log('login end');
}
