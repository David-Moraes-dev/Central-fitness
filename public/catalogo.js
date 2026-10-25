/* Catálogo v1: validação integral antes da troca; sem chamadas ao Mercado Livre. */
window.CentralCatalogo = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function url(value, kind) {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.username || u.password) return false;
      return kind === 'affiliate'
        ? (u.hostname === 'meli.la' && /^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) ||
          (['www.mercadolivre.com.br','mercadolivre.com.br'].includes(u.hostname) && /^\/sec\/[A-Za-z0-9_-]+\/?$/.test(u.pathname))
        : u.hostname === 'http2.mlstatic.com';
    } catch { return false; }
  }
  function validate(data, site, categories) {
    if (!data || data.schemaVersion !== 1 || data.site !== site || !Array.isArray(data.products) || !data.products.length || data.products.length > 500) throw Error('Catálogo inválido');
    const ids=new Set(), links=new Set(), items=new Set();
    for (const p of data.products) {
      if (!p || typeof p.id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(p.id) || ids.has(p.id) || links.has(p.link)) throw Error('Identidade duplicada ou inválida');
      if (p.marketplaceItemId !== null && (!/^MLB\d+$/.test(p.marketplaceItemId) || items.has(p.marketplaceItemId))) throw Error('ID do anúncio inválido ou duplicado');
      if (typeof p.name !== 'string' || !p.name.trim() || p.name.length>500 || typeof p.description !== 'string' || p.description.length>2000 || !categories.includes(p.category)) throw Error('Conteúdo inválido');
      if (!url(p.link,'affiliate') || !url(p.image,'image')) throw Error('URL inválida');
      if (!['unknown','available','unavailable'].includes(p.availability)) throw Error('Disponibilidade inválida');
      if (p.price !== null && (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price <= 0)) throw Error('Preço inválido');
      if (p.oldPrice !== null && (typeof p.oldPrice !== 'number' || !Number.isFinite(p.oldPrice) || p.oldPrice <= 0)) throw Error('Preço anterior inválido');
      // Esta etapa não publica preços: ainda não há fonte de verificação integrada.
      if (p.price !== null || p.oldPrice !== null) throw Error('Verificação de preços ainda não integrada');
      if (p.anchor && !/^[a-z][a-z0-9-]*$/.test(p.anchor)) throw Error('Âncora inválida');
      ids.add(p.id); links.add(p.link); if(p.marketplaceItemId) items.add(p.marketplaceItemId);
    }
    return data.products;
  }
  async function load(site, categories, apply) {
    document.documentElement.dataset.catalogo='reserva';
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
    try {
      const response=await fetch('./produtos.json',{cache:'no-store',signal:controller.signal});
      if(!response.ok) throw Error('Falha ao carregar');
      const products=validate(await response.json(),site,categories);
      apply(products);
      document.documentElement.dataset.catalogo='carregado';
      window.dispatchEvent(new Event('catalogo:carregado'));
    } catch {
      console.warn('Catálogo não carregado. A seleção de reserva foi mantida.');
    } finally { clearTimeout(timer); }
  }
  return {load,validate,esc};
})();
