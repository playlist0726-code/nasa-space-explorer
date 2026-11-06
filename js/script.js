/* Custom application logic. The classroom's dateRange.js stays unchanged. */
'use strict';
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
setupDateInputs(startInput, endInput);
const form = document.getElementById('exploreForm');
const gallery = document.getElementById('gallery');
const status = document.getElementById('status');
const fetchButton = document.getElementById('fetchButton');
const retryButton = document.getElementById('retryButton');
const summary = document.getElementById('resultSummary');
const modal = document.getElementById('detailModal');
const sortOrder = document.getElementById('sortOrder');
const facts = [
  'Sunlight takes about 8 minutes and 20 seconds to reach Earth.',
  'A day on Venus is longer than a year on Venus.',
  'Saturn is less dense than water, on average.',
  'The footprints left by Apollo astronauts can last for millions of years on the Moon.',
  'Jupiter’s Great Red Spot is a giant storm that has been observed for centuries.',
  'Neutron stars can pack more mass than the Sun into a sphere about the size of a city.',
  'Our Milky Way galaxy contains hundreds of billions of stars.',
  'The Moon moves about 3.8 centimeters farther from Earth each year.',
  'Olympus Mons on Mars is the largest known volcano in our solar system.',
  'The International Space Station completes an orbit of Earth about every 90 minutes.'
];
let factIndex = Math.floor(Math.random() * facts.length);
function showFact() { document.getElementById('spaceFact').textContent = facts[factIndex]; }
showFact();
document.getElementById('nextFact').addEventListener('click', () => {
  factIndex = (factIndex + 1 + Math.floor(Math.random() * (facts.length - 1))) % facts.length;
  showFact();
});
let entries = [];
let requestController;
const memoryCache = new Map();
function cleanText(html = '') {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.querySelectorAll('script,style').forEach(node => node.remove());
  doc.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  return doc.body.textContent.replace(/^\s*Explanation:\s*/i, '').trim();
}
function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
function displayDate(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
}
function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function sourceURL(item) {
  return safeURL(item.permalink) || `https://science.nasa.gov/apod/?date=${item.date.replaceAll('-', '').slice(2)}`;
}
function normalize(item) {
  const video = item.media_type === 'video' || item.media_type === 'iframe';
  // Since September 2026, NASA's url field can be a post permalink. Prefer hdurl for images.
  const image = safeURL(item.hdurl) || (item.media_type === 'image' ? safeURL(item.url) : '');
  return {...item, title:cleanText(item.title || 'Untitled discovery'), explanation:cleanText(item.explanation),
    creditText:cleanText(item.credit || item.copyright || 'NASA APOD'), video, image};
}
function addImage(parent, url, alt, lazy = true) {
  if (!url) return;
  const img = make('img'); img.src = url; img.alt = alt;
  img.loading = lazy ? 'lazy' : 'eager'; img.decoding = 'async';
  img.addEventListener('error', () => { img.remove(); parent.append(make('span','video-symbol','✧')); }, {once:true});
  parent.append(img);
}
function openDetail(item) {
  const media = document.getElementById('modalMedia'); media.replaceChildren();
  if (item.video) {
    const content = make('div','video-message','This discovery is a video. Watch it on NASA’s page.');
    const link = make('a','', 'Watch video on NASA ↗'); link.href = sourceURL(item);
    link.target = '_blank'; link.rel = 'noopener noreferrer'; content.append(link); media.append(content);
    if (item.image) addImage(media,item.image,item.title,false);
  } else {
    addImage(media,item.image,item.alt || item.title,false);
  }
  document.getElementById('modalTitle').textContent = item.title;
  document.getElementById('modalDate').textContent = `${displayDate(item.date)} · ${item.video ? 'VIDEO' : 'IMAGE'}`;
  document.getElementById('modalExplanation').textContent = item.explanation || 'Read the full story on NASA.';
  document.getElementById('modalCredit').textContent = `Credit / copyright: ${item.creditText}`;
  document.getElementById('modalSource').href = sourceURL(item);
  modal.showModal();
}
document.getElementById('closeModal').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => {
  const bounds = modal.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
});
function renderGallery() {
  gallery.replaceChildren();
  const sorted = [...entries].sort((a,b) => sortOrder.value === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  for (const item of sorted) {
    const card = make('button','card'); card.type = 'button';
    card.setAttribute('aria-label', `View ${item.title}, ${displayDate(item.date)}${item.video ? ', video' : ''}`);
    const imageBox = make('div','card-image');
    addImage(imageBox,item.video ? safeURL(item.thumbnail_url) || item.image : item.image,item.alt || item.title);
    imageBox.append(make('span','card-type',item.video ? '↗ VIDEO' : 'APOD / IMAGE'));
    if (item.video) imageBox.append(make('span','video-symbol','▷'));
    const info = make('div','card-info');
    const time = make('time','card-date',displayDate(item.date).toUpperCase()); time.dateTime = item.date;
    info.append(time,make('h3','',item.title),make('span','card-arrow','↗'));
    card.append(imageBox,info); card.addEventListener('click', () => openDetail(item)); gallery.append(card);
  }
  if (!sorted.length) gallery.append(make('p','empty','No discoveries are available for these dates. Try a different range.'));
}
sortOrder.addEventListener('change', renderGallery);
function offsetDate(date, days) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10);
}
async function fetchJSON(url, signal) {
  const timeout = AbortSignal.timeout(20000);
  const response = await fetch(url, {signal:AbortSignal.any([signal, timeout])});
  if (!response.ok) throw new Error(response.status === 429 ? 'NASA is receiving many requests. Please try again shortly.' : `NASA returned an error (${response.status}). Please try again.`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('NASA returned an unexpected response. Please try again.');
  return data;
}
async function getRange(start, end, signal) {
  const cacheKey = `${start}/${end}`;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);
  const all = [];
  // NASA's keyless APOD feed defaults to 25 records: request bounded inclusive chunks.
  for (let from = start; from <= end; from = offsetDate(from,25)) {
    const to = offsetDate(from,24) < end ? offsetDate(from,24) : end;
    let data;
    try {
      const params = new URLSearchParams({date_from:from.replaceAll('-','').slice(2), date_to:to.replaceAll('-','').slice(2),per_page:'25'});
      data = await fetchJSON(`https://science.nasa.gov/wp-json/wp/v2/apod-basic?${params}`,signal);
    } catch (error) {
      if (signal.aborted) throw error;
      // Compatibility fallback for deployments where the new feed is unavailable.
      const params = new URLSearchParams({api_key:'DEMO_KEY',start_date:from,end_date:to,thumbs:'true'});
      data = await fetchJSON(`https://api.nasa.gov/planetary/apod?${params}`,signal);
    }
    all.push(...data.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.date >= from && item.date <= to));
  }
  const unique = [...new Map(all.map(item => [item.date,item])).values()].map(normalize);
  memoryCache.set(cacheKey,unique); return unique;
}
async function loadImages(event) {
  event?.preventDefault();
  const start = startInput.value, end = endInput.value;
  const days = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
  if (!start || !end || start < earliestDate || end > today || start > end || !Number.isFinite(days) || days > 366) {
    status.className = 'status error'; status.textContent = 'Choose a valid range from June 16, 1995 to today, with the start before the end (up to 366 days).'; return;
  }
  requestController?.abort(); const controller = new AbortController(); requestController = controller;
  status.className = 'status loading'; status.textContent = 'Loading space photos… Your next discovery is on its way.';
  gallery.replaceChildren(); gallery.setAttribute('aria-busy','true'); summary.textContent = 'Connecting to NASA';
  fetchButton.disabled = true; retryButton.hidden = true;
  try {
    entries = await getRange(start,end,controller.signal);
    if (controller.signal.aborted) return;
    renderGallery();
    const missing = days - entries.length;
    status.className = 'status';
    status.textContent = missing > 0 ? `${missing} day${missing === 1 ? ' is' : 's are'} not available in NASA’s feed for this range. Try an earlier date if today’s entry has not been published.` : '';
    summary.textContent = `${entries.length} ${entries.length === 1 ? 'discovery' : 'discoveries'} · ${displayDate(start)} — ${displayDate(end)}`;
  } catch (error) {
    if (controller.signal.aborted) return;
    entries = []; status.className = 'status error';
    status.textContent = navigator.onLine ? (error.name === 'TimeoutError' ? 'NASA is taking longer than expected. Please try again.' : error.message === 'Failed to fetch' ? 'We could not connect to NASA. Please check your connection and try again.' : error.message) : 'You appear to be offline. Reconnect and try again.';
    summary.textContent = 'Connection interrupted'; retryButton.hidden = false;
  } finally {
    if (requestController === controller) { fetchButton.disabled = false; gallery.setAttribute('aria-busy','false'); }
  }
}
form.addEventListener('submit',loadImages);
retryButton.addEventListener('click',loadImages);
loadImages();
