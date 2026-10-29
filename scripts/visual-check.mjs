import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('test-results/visual',{recursive:true});
try{
  await page.goto('http://127.0.0.1:3000/pos');
  await page.getByRole('button',{name:'English',exact:true}).click();
  await page.screenshot({path:'test-results/visual/pos-desktop.png',fullPage:true});
  await page.goto('http://127.0.0.1:3000/dashboard');
  await page.screenshot({path:'test-results/visual/dashboard-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:3000/pos');
  await page.screenshot({path:'test-results/visual/pos-phone.png',fullPage:true});
  await page.goto('http://127.0.0.1:3000/inventory');
  await page.screenshot({path:'test-results/visual/inventory-phone.png',fullPage:true});
  await page.goto('http://127.0.0.1:3000/login');
  await page.screenshot({path:'test-results/visual/login-phone.png',fullPage:true});
  console.log(JSON.stringify({screenshots:5,pageErrors:errors}));
  if(errors.length)process.exitCode=1;
}finally{await browser.close();}
