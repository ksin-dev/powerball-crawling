import puppeteer, { BoundingBox } from 'puppeteer'
import { addDays, differenceInDays, format } from 'date-fns';
import { promises as fs, constants } from 'fs'
import {env} from './env'

async function moreList(frame: puppeteer.Page) {
  // const elementHandle = await page.waitForSelector('#mainFrame') as puppeteer.ElementHandle<Element>;
  // const frame = await elementHandle.contentFrame() as puppeteer.Frame;
  await frame.waitForSelector('.moreBox')
  const style:string = await frame.$eval('.moreBox', el => el.getAttribute('style')) as string;
  if (style?.includes('display')) {
    return false;
  }

  await frame.waitForSelector('.moreBox > a');
  await frame.click('.moreBox > a');
  await frame.waitForTimeout(200);
  return true;
}

async function getData(frame: puppeteer.Page, date: Date) {
  // const elementHandle = await page.waitForSelector('#mainFrame') as puppeteer.ElementHandle<Element>;
  // const frame = await elementHandle.contentFrame() as puppeteer.Frame;
  const tbody = await frame.waitForSelector('#powerballLogBox>tbody.content') as puppeteer.ElementHandle<Element>;
  const today = format(date, 'yyyy,MM,dd');
  const res = await tbody.$$eval('tr', trs => {
    return trs.map((tr) => {
      const columns = tr.querySelectorAll('td');
      if(columns.length < 7) return "";
      //회차
      const cnt = columns[0].querySelectorAll('.numberText');
      const time = columns[1].innerText.split(':');
      const results = columns[6].innerText.split(',').map(str=>str.trim());
      const special = columns[2].querySelector('div')?.innerText;
      const round1 = cnt[0].innerHTML;
      const round2 = cnt[1].innerHTML;

      
      return [time[0], time[1], round1.slice(0, round1.length - 1), round2.slice(0, round2.length - 1), ...results, special].join(',');
    }).filter((v)=>!!v.length);
  });

  const csvString =  res.reduce((prev, next) => {
    prev += today + ',' + next + '\n'
    return prev;
  }, '')
  
  return csvString;
}

export async function getLogs(page: puppeteer.Page) {
  let startDate = env.startDate;

  
  await fs.access(env.output, constants.F_OK).catch(e => {
    return fs.writeFile(env.output, 'year,month,day,hour,minute,round1,round2,1,2,3,4,5,special\n');
  })

  const buffer = await fs.readFile(env.output)
  const s = buffer.toString();
  const v = s.split('\n');
  if (v.length > 2) {
    const arr = v[v.length - 2].split(',');

    startDate = new Date(Number(arr[0]), Number(arr[1]) - 1, Number(arr[2]));
    startDate = addDays(startDate, 1);
  } 

  console.log(`crawling start: ${format(startDate, 'yyyy-MM-dd')}`);

  // file.write('year,month,day,hour,minute,round1,round2,1,2,3,4,5,special\n');
  while (differenceInDays(env.endDate, startDate) > 0) {
    const d = format(startDate, 'yyyy-MM-dd');
    console.log(d + ' start');
    // await page.setCookie(...cookies);
    const url = `https://www.powerballgame.co.kr/?view=dayLog&date=${format(startDate, 'yyyy-MM-dd')}`;
    await page.goto(url, { waitUntil: 'load' });
    page.waitForTimeout(500);
    while (await moreList(page));    
    const s = await getData(page, startDate);
    await fs.appendFile(env.output,s);
    startDate = addDays(startDate, 1);

    console.log(d + ' end');
  }


}