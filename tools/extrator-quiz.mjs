#!/usr/bin/env node
// Extrator de quiz/funil para a Nave Master.
// Renderiza uma página JS (SPA) num navegador headless, percorre o funil
// tela a tela (clicando uma opção / preenchendo campos / avançando) e salva,
// para cada tela: screenshot + texto visível. No fim gera um transcript.json
// e um transcript.txt prontos para o agente nave-especialista-feedback analisar.
//
// Uso:
//   node tools/extrator-quiz.mjs <url> [--page] [--out <dir>] [--max-steps N] [--headful] [--desktop]
//
//   Sem --page  → modo quiz/funil: percorre tela a tela (clica/preenche/avança).
//   Com --page  → modo página única (venda / low ticket / anúncio): rola tudo e captura de uma vez.
//
// Exemplos:
//   node tools/extrator-quiz.mjs https://inlead.digital/cple-agente-fluxo
//   node tools/extrator-quiz.mjs https://minhapagina.com/oferta --page
//
// Pré-requisito (uma vez):
//   npm i -D playwright && npx playwright install chromium

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// ---------- args ----------
const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--'));
if (!url) {
  console.error('Faltou a URL.\nUso: node tools/extrator-quiz.mjs <url> [--out dir] [--max-steps N] [--headful] [--desktop]');
  process.exit(1);
}
const getFlag = (name, def) => {
  const i = argv.indexOf(name);
  return i === -1 ? def : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true);
};
const slug = url.replace(/https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = String(getFlag('--out', join('saida', `${slug}-${stamp}`)));
const maxSteps = Number(getFlag('--max-steps', 25));
const headful = Boolean(getFlag('--headful', false));
const desktop = Boolean(getFlag('--desktop', false));
const pageMode = Boolean(getFlag('--page', false)); // captura única (página de vendas / low ticket / anúncio)

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');
const norm = (s) => (s || '').replace(/\d+\s*%?/g, '').replace(/\s+/g, ' ').trim(); // ignora % de loaders
const bodyNorm = async (page) => norm(await page.evaluate(() => document.body.innerText || ''));
async function waitForChange(page, baselineNorm, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await sleep(1200);
    const n = await bodyNorm(page);
    if (n && n !== baselineNorm) return true;
  }
  return false;
}

// Roda DENTRO da página. Lê o texto visível e escolhe o próximo elemento a acionar.
// Retorna { text, plan } onde plan descreve a ação que o Node deve executar via Playwright.
function inPageScan() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const txt = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');

  const bodyText = (document.body.innerText || '').trim();

  // 1) campos preenchíveis ainda vazios (calculadora / input numérico)
  const inputs = [...document.querySelectorAll('input, textarea')].filter((el) => {
    const t = (el.type || '').toLowerCase();
    if (['hidden', 'submit', 'button', 'checkbox', 'radio'].includes(t)) return false;
    return visible(el);
  });
  const empties = inputs.filter((el) => el.type !== 'range' && !el.value);
  const ranges = inputs.filter((el) => el.type === 'range');

  // marca campos a preencher
  empties.forEach((el, i) => el.setAttribute('data-ext-fill', String(i)));
  ranges.forEach((el, i) => el.setAttribute('data-ext-range', String(i)));

  // 2) candidatos clicáveis
  const sel = 'button,[role="button"],a[href],label,[class*="option"],[class*="opcao"],[class*="answer"],[class*="resposta"],[class*="card"],[class*="choice"],[class*="alternativa"]';
  let clickables = [...document.querySelectorAll(sel)].filter(visible);

  // remove "voltar", rodapé/marca e links externos (ex: logo inlead, central de anúncios)
  const isBack = (el) => /voltar|back|anterior|←|◀/i.test(txt(el));
  const isJunk = (el) => {
    const label = txt(el).toLowerCase();
    if (/inlead|central de an[uú]ncios|pol[ií]tica|termos|privacidade|cookie|©|criado via/.test(label)) return true;
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') || '';
      try { if (href && new URL(href, location.href).hostname !== location.hostname) return true; } catch {}
    }
    return false;
  };
  clickables = clickables.filter((el) => !isBack(el) && !isJunk(el));

  // botão de avançar/continuar/iniciar/ver resultado
  const advanceRe = /(avan[çc]ar|continuar|pr[oó]xim|come[çc]ar|iniciar|seguir|ver\s+resultado|finalizar|enviar|quero|bora|vamos|descobrir|calcular)/i;
  const advanceBtn = clickables.find((el) => advanceRe.test(txt(el)));

  // opções de resposta = clicáveis curtos que não são o botão de avançar
  const options = clickables.filter((el) => el !== advanceBtn && txt(el).length > 0 && txt(el).length < 120);

  let plan = null;
  if (empties.length || ranges.length) {
    // preencher campos e depois avançar
    plan = { kind: 'fill', advance: advanceBtn ? txt(advanceBtn) : null };
    if (advanceBtn) advanceBtn.setAttribute('data-ext-advance', '1');
  } else if (options.length) {
    // clicar primeira opção (muitas telas auto-avançam)
    options[0].setAttribute('data-ext-click', '1');
    plan = { kind: 'option', label: txt(options[0]) };
  } else if (advanceBtn) {
    advanceBtn.setAttribute('data-ext-advance', '1');
    plan = { kind: 'advance', label: txt(advanceBtn) };
  } else {
    plan = { kind: 'end', reason: 'sem elemento acionável' };
  }

  return { text: bodyText, plan, counts: { options: options.length, empties: empties.length, ranges: ranges.length } };
}

(async () => {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext({
    userAgent: UA,
    locale: 'pt-BR',
    viewport: desktop ? { width: 1280, height: 900 } : { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: !desktop,
    hasTouch: !desktop,
  });
  const page = await context.newPage();

  console.log(`→ abrindo ${url}${pageMode ? ' (modo página única)' : ''}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await sleep(2500); // folga pro JS montar a 1ª tela

  // MODO PÁGINA ÚNICA: rola até o fim (carrega lazy), captura tudo de uma vez, sem clicar.
  if (pageMode) {
    await page.evaluate(async () => {
      await new Promise((res) => {
        let y = 0;
        const t = setInterval(() => {
          window.scrollBy(0, 600);
          y += 600;
          if (y >= document.body.scrollHeight) { clearInterval(t); res(); }
        }, 200);
      });
    }).catch(() => {});
    await sleep(1500);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    const shot = join(outDir, 'pagina.png');
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    const text = await page.evaluate(() => document.body.innerText || '');
    await writeFile(join(outDir, 'transcript.txt'), `URL: ${url}\nCapturado em: ${new Date().toISOString()}\nModo: página única\n\n${text}`);
    await writeFile(join(outDir, 'transcript.json'), JSON.stringify({ url, modo: 'pagina', capturadoEm: new Date().toISOString(), texto: text }, null, 2));
    console.log(`\n✓ página capturada em: ${outDir}\n  - transcript.txt (texto completo)\n  - pagina.png (screenshot de página inteira)`);
    await browser.close();
    return;
  }

  const transcript = [];
  let prevText = '';
  let stale = 0;
  const startHost = new URL(url).hostname;

  for (let step = 1; step <= maxSteps; step++) {
    // se navegou para outro domínio (ex: checkout Hotmart), o funil acabou
    const curHost = (() => { try { return new URL(page.url()).hostname; } catch { return startHost; } })();
    if (step > 1 && curHost !== startHost) {
      console.log(`→ saiu do funil para ${curHost} (oferta/checkout externo) — encerrando.`);
      break;
    }
    // espera o conteúdo estabilizar um pouco
    await sleep(800);
    const shot = join(outDir, `${pad(step)}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});

    const { text, plan, counts } = await page.evaluate(inPageScan);
    transcript.push({ step, screenshot: `${pad(step)}.png`, plan, counts, text });
    console.log(`tela ${pad(step)} | ${plan.kind}${plan.label ? ' → "' + plan.label + '"' : ''} | opc:${counts.options} inp:${counts.empties} sld:${counts.ranges}`);

    // detecta fim por repetição de conteúdo
    if (text && text === prevText) {
      stale++;
      if (stale >= 2) { console.log('→ conteúdo parou de mudar, encerrando.'); break; }
    } else {
      stale = 0;
    }
    prevText = text;

    if (plan.kind === 'end') {
      // pode ser tela de carregamento / prova social que auto-avança por timer
      console.log('  (sem botão — aguardando possível auto-avanço…)');
      const advanced = await waitForChange(page, norm(text), 12000);
      if (advanced) continue; // re-escaneia a próxima tela
      console.log('→ tela final, encerrando.');
      break;
    }

    // executa a ação planejada
    try {
      if (plan.kind === 'fill') {
        for (const el of await page.$$('[data-ext-fill]')) { await el.fill('10').catch(() => {}); }
        for (const el of await page.$$('[data-ext-range]')) {
          await el.evaluate((r) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(r, Math.round((Number(r.min || 0) + Number(r.max || 10)) / 2));
            r.dispatchEvent(new Event('input', { bubbles: true }));
            r.dispatchEvent(new Event('change', { bubbles: true }));
          }).catch(() => {});
        }
        const adv = await page.$('[data-ext-advance]');
        if (adv) await adv.click({ timeout: 5000 }).catch(() => {});
      } else if (plan.kind === 'option') {
        const el = await page.$('[data-ext-click]');
        if (el) await el.click({ timeout: 5000 }).catch(() => {});
        // se não auto-avançou, tenta um botão de continuar
        await sleep(600);
        const adv = await page.$('[data-ext-advance]');
        if (adv) await adv.click({ timeout: 3000 }).catch(() => {});
      } else if (plan.kind === 'advance') {
        const el = await page.$('[data-ext-advance]');
        if (el) await el.click({ timeout: 5000 }).catch(() => {});
      }
    } catch (e) {
      console.log('  (aviso ao acionar:', e.message, ')');
    }

    // limpa marcadores e espera transição
    await page.evaluate(() => {
      document.querySelectorAll('[data-ext-fill],[data-ext-range],[data-ext-click],[data-ext-advance]')
        .forEach((el) => { el.removeAttribute('data-ext-fill'); el.removeAttribute('data-ext-range'); el.removeAttribute('data-ext-click'); el.removeAttribute('data-ext-advance'); });
    }).catch(() => {});
    await sleep(1200);
  }

  // saídas
  await writeFile(join(outDir, 'transcript.json'), JSON.stringify({ url, capturadoEm: new Date().toISOString(), telas: transcript }, null, 2));
  const txt = transcript.map((t) =>
    `===== TELA ${t.step} (${t.screenshot}) =====\n[ação: ${t.plan.kind}${t.plan.label ? ' → ' + t.plan.label : ''}]\n${t.text}\n`
  ).join('\n');
  await writeFile(join(outDir, 'transcript.txt'), `URL: ${url}\nCapturado em: ${new Date().toISOString()}\nTelas: ${transcript.length}\n\n${txt}`);

  console.log(`\n✓ ${transcript.length} telas salvas em: ${outDir}`);
  console.log(`  - transcript.txt  (texto de cada tela)`);
  console.log(`  - transcript.json (estruturado)`);
  console.log(`  - 01.png, 02.png… (screenshots)`);

  await browser.close();
})().catch((e) => { console.error('ERRO:', e); process.exit(1); });
