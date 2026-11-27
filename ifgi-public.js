(function () {
  'use strict';
  var CONTENT_KEY='ifgi.site.content.v1', ARTICLE_KEY='ifgi.site.articles.v1';
  var categories={Campus:'campus',Ateliers:'ateliers',Laboratoires:'labos','Événements':'events'};
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch(_){return fallback;}}
  function flagGet(key){try{return localStorage.getItem(key);}catch(_){return null;}}
  function flagSet(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch(_){}}
  function safeHTML(source){var box=document.createElement('template');box.innerHTML=String(source||'');box.content.querySelectorAll('script,object,embed,form').forEach(function(el){el.remove();});box.content.querySelectorAll('*').forEach(function(el){Array.prototype.slice.call(el.attributes).forEach(function(a){var n=a.name.toLowerCase(),v=a.value.trim().toLowerCase();if(n.indexOf('on')===0||((n==='href'||n==='src')&&v.indexOf('javascript:')===0)||(n==='src'&&v.indexOf('data:')===0&&!v.startsWith('data:image/')))el.removeAttribute(a.name);});if(el.tagName==='IFRAME'){var src=el.getAttribute('src')||'';if(!/^https:\/\/www\.youtube\.com\/embed\/[\w-]{6,}/.test(src))el.remove();}});return box.innerHTML;}
  function setText(el,value){if(el&&value!=null)el.textContent=value;}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function safeImage(value){return /^(https:\/\/|data:image\/)/i.test(String(value||''))?String(value).replace(/["\\]/g,''):'';}
  function formatDate(iso){if(!iso)return '';var d=new Date(iso+'T12:00:00');return isNaN(d.getTime())?iso:new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'long',year:'numeric'}).format(d);}
  function setLinkLabel(el,label){if(!el||!label)return;var icon=el.querySelector('svg');el.textContent=label;if(icon)el.appendChild(icon);}

  var baseline=JSON.parse(JSON.stringify(window.ifgiPublicArticles||[]));
  var articleState=read(ARTICLE_KEY,[]);
  function activeArticles(){
    var map={};articleState.forEach(function(a){map[a.id]=a;});
    return baseline.map(function(a){var saved=map[a.id];if(!saved)return a;if(saved.published===false||saved.deleted)return null;var copy=Object.assign({},a,saved);copy.dateLabel=formatDate(saved.date)||a.date;copy.date=copy.dateLabel;copy.author=saved.author||a.author;copy.min=saved.min||a.min;copy.contentHtml=safeHTML(saved.content||'');return copy;}).filter(Boolean).concat(articleState.filter(function(a){return a.id>baseline.length&&!baseline.some(function(b){return b.id===a.id;})&&a.published!==false&&!a.deleted;}).map(function(a){var label=formatDate(a.date);return Object.assign({cat:'Actualité',dateLabel:label,date:label,author:'Cellule Communication',min:'3 min de lecture',g:'g1',icon:'i-news',tags:[],paras:[a.desc||'']},a,{contentHtml:safeHTML(a.content||'')});}));
  }
  function renderArticles(articles){
    if(!articles.length)return;
    var featured=document.querySelector('#actualite .feat-card');
    if(featured){var a=articles[0];setText(featured.querySelector('.cat'),'À la une — '+a.cat);setText(featured.querySelector('h3'),a.title);setText(featured.querySelector('p'),a.desc||((a.paras||[])[0]||''));var link=featured.querySelector('a.more');if(link)link.href='#article-'+a.id;}
    var grid=document.querySelector('#actualite .news-grid');
    if(grid){grid.innerHTML=articles.slice(1).map(function(a,i){var date=a.dateLabel||a.date;var summary=a.desc||((a.paras||[])[0]||'');return '<article class="news-card tilt" data-reveal style="--d:'+(i*.08)+'s"><div class="thumb '+esc(a.g)+'"><span class="date-b"><svg class="icon"><use href="#i-cal"/></svg> '+esc(date)+'</span><svg class="icon"><use href="#'+esc(a.icon)+'"/></svg></div><div class="news-body"><div class="cat">'+esc(a.cat)+'</div><h3>'+esc(a.title)+'</h3><p>'+esc(summary)+'</p><a class="more" href="#article-'+Number(a.id)+'">Lire l’article <svg class="icon"><use href="#i-ar"/></svg></a></div></article>';}).join('');}
  }
  function applyContent(){
    var data=read(CONTENT_KEY,{});
    if(data.hero){
      var heroWrap=document.querySelector('#accueil .hero');if(heroWrap)heroWrap.hidden=data.hero.enabled===false;
      var h=document.querySelector('#accueil .hero h1');if(h)h.innerHTML=esc(data.hero.line1)+' <span class="grad">'+esc(data.hero.gradient)+'</span><br>'+esc(data.hero.line2);
      setText(document.querySelector('#accueil .hero .lead'),data.hero.description);
      var badge=document.querySelector('#accueil .hero-badge');if(badge){var node=Array.prototype.slice.call(badge.childNodes).find(function(n){return n.nodeType===3;});if(node)node.textContent=' '+(data.hero.location||'');}
      setLinkLabel(document.querySelector('#accueil .hero-btns .btn-or'),data.hero.button||'');
      (data.hero.chips||[]).forEach(function(label,i){var chip=document.querySelector('#accueil .chip-float.cf'+(i+1));if(chip){var svg=chip.querySelector('svg');chip.textContent=label;if(svg)chip.insertBefore(svg,chip.firstChild);}});
      (data.hero.stats||[]).forEach(function(value,i){var stat=document.querySelectorAll('#accueil .hero-stats .stat')[i];if(!stat)return;var num=stat.querySelector('.num');if(num){var suffix=stat.querySelector('b').lastChild;if(suffix&&suffix.nodeType===3){var current=suffix.textContent.trim();if(current==='+'||current==='%'){}else suffix.textContent='';}num.setAttribute('data-count',String(parseInt(value,10)||0));num.textContent=String(parseInt(value,10)||0);} });
    }
    if(data.homeVideo||data.video){var vid=data.video||{};var homeVid=data.homeVideo||{};var source=homeVid.id||vid.id||'';var vidId=/^[\w-]{11}$/.test(source)?source:((source.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)||[])[1]||'');var playLabel=homeVid.playLabel||'Lire la vidéo de présentation';setText(document.querySelector('#vidOverlay .vid-label'),playLabel);setText(document.querySelector('#vidBox .vid-badge-left'),vid.subtitle||'Présentation officielle IFGI');if(vid.title)setText(document.querySelector('#galerie .vid-right h2'),vid.title);if(homeVid.benefits){var features=homeVid.benefits.split(/\r?\n/).filter(Boolean);var list=document.querySelector('#galerie .vid-feats-list');if(list)list.innerHTML=features.map(function(item){return '<li><span class="vchk"><svg class="icon"><use href="#i-check"/></svg></span> '+esc(item)+'</li>';}).join('');}var oldPlay=document.getElementById('vidPlayBtn');if(oldPlay){var newPlay=oldPlay.cloneNode(true);oldPlay.parentNode.replaceChild(newPlay,oldPlay);newPlay.addEventListener('click',function(){if(!vidId)return;var box=document.getElementById('vidBox'),overlay=document.getElementById('vidOverlay'),frame=document.createElement('iframe');frame.src='https://www.youtube.com/embed/'+vidId+'?autoplay=1&rel=0';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';frame.allowFullscreen=true;frame.title=vid.title||'Présentation vidéo de l’IFGI';frame.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;z-index:2';box.appendChild(frame);overlay.classList.add('hidden');});}}
    if(data.marquee){var mq=document.querySelectorAll('#accueil .mq-track span');mq.forEach(function(el){el.textContent=data.marquee.replace(/\s*[•·]\s*/g,'  •  ');});}
    var programCards=Array.prototype.slice.call(document.querySelectorAll('#accueil .prog-grid .prog'));programCards.forEach(function(card,i){if(!card.hasAttribute('data-sync-id'))card.setAttribute('data-sync-id',String(i+1));if((data.deletedProgramIds||[]).indexOf(Number(card.getAttribute('data-sync-id')))>=0)card.remove();});
    (data.programs||[]).forEach(function(p){var card=Array.prototype.slice.call(document.querySelectorAll('#accueil .prog-grid .prog')).find(function(el){return Number(el.getAttribute('data-sync-id'))===Number(p.id);});if(!card&&Number(p.id)>6){card=document.createElement('article');card.className='prog tilt';card.setAttribute('data-sync-id',p.id);card.innerHTML='<span class="code"></span><div class="ico"><svg class="icon"><use href="#i-grad"/></svg></div><h3></h3><p></p><div class="tags"><span class="tag"></span><span class="tag bl"></span></div><a class="more" href="#renseignement" data-route="renseignement">En savoir plus <svg class="icon"><use href="#i-ar"/></svg></a>';document.querySelector('#accueil .prog-grid').appendChild(card);}if(!card)return;setText(card.querySelector('.code'),p.code||'');setText(card.querySelector('h3'),p.title);setText(card.querySelector('p'),p.description);var tags=card.querySelectorAll('.tags .tag');(p.tags||[]).forEach(function(t,j){setText(tags[j],t);});card.hidden=p.enabled===false;});

    var galleryItems=Array.prototype.slice.call(document.querySelectorAll('#ggrid .g-item'));
    galleryItems.forEach(function(el,i){if(!el.hasAttribute('data-sync-id'))el.setAttribute('data-sync-id',String(i+1));if((data.deletedGalleryIds||[]).indexOf(Number(el.getAttribute('data-sync-id')))>=0)el.remove();});
    (data.gallery||[]).forEach(function(item){
      galleryItems=Array.prototype.slice.call(document.querySelectorAll('#ggrid .g-item'));
      var target=galleryItems.find(function(el){return Number(el.getAttribute('data-sync-id'))===Number(item.id);});
      var cat=categories[item.category]||String(item.category||'campus').toLowerCase();
      if(!target&&Number(item.id)>12){target=document.createElement('button');target.type='button';target.className='g-item g1';target.setAttribute('data-sync-id',item.id);target.innerHTML='<svg class="icon"><use href="#i-img"/></svg><span class="lab"><b></b><span></span></span>';document.getElementById('ggrid').appendChild(target);target.addEventListener('click',function(){openGalleryItem(target);});}
      if(target){target.setAttribute('data-cat',cat);target.setAttribute('data-t',item.title||'');target.setAttribute('data-d',item.description||'');target.setAttribute('data-image',safeImage(item.image));var title=target.querySelector('.lab b');var category=target.querySelector('.lab span');setText(title,item.title);setText(category,item.category);var image=safeImage(item.image);if(image){target.style.backgroundImage='url("'+image.replace(/"/g,'%22')+'")';target.style.backgroundSize='cover';target.style.backgroundPosition='center';}}
    });

    if(data.contact){
      var c=data.contact;var info=document.querySelectorAll('#renseignement .info-grid .icard');
      if(info[0])setText(info[0].querySelector('p'),c.address);
      if(info[1]){var phoneLinks=info[1].querySelectorAll('a');if(phoneLinks[0]){phoneLinks[0].href='tel:'+String(c.phone1||'').replace(/\D/g,'');setText(phoneLinks[0],c.phone1);}if(phoneLinks[1]){phoneLinks[1].href='tel:'+String(c.phone2||'').replace(/\D/g,'');setText(phoneLinks[1],c.phone2);}}
      if(info[2]){var email=info[2].querySelector('a');if(email){email.href='mailto:'+c.email;setText(email,c.email);}}
      if(info[3])setText(info[3].querySelector('p'),c.hours);
      var footer=document.querySelector('.f-contact');if(footer){var spans=footer.querySelectorAll('li span');if(spans[0])spans[0].innerHTML=esc(c.address).replace(/,\s*/g,'<br>');var tel=footer.querySelectorAll('a[href^="tel:"]');if(tel[0]){tel[0].href='tel:'+String(c.phone1||'').replace(/\D/g,'');setText(tel[0],c.phone1);}if(tel[1]){tel[1].href='tel:'+String(c.phone2||'').replace(/\D/g,'');setText(tel[1],c.phone2);}var mail=footer.querySelector('a[href^="mailto:"]');if(mail){mail.href='mailto:'+c.email;setText(mail,c.email);}}
      if(data.social){var links=document.querySelectorAll('.socials a');var mapSocial=[data.social[0],'',data.social[2],'https://wa.me/'+String(data.social[1]||'').replace(/\D/g,'')];mapSocial.forEach(function(url,i){if(links[i]&&url){try{var parsed=new URL(url,location.href);if(parsed.protocol==='https:'||parsed.protocol==='http:')links[i].href=parsed.href;}catch(_){}}});}
      var map=document.querySelector('#renseignement .map-card iframe');if(map&&c.map){try{var parsed=new URL(c.map);if(parsed.protocol==='https:')map.src=parsed.href;}catch(_){}}
    }

    if(data.about){
      var founder=data.about.founder||[];setText(document.querySelector('#apropos .found .np b'),founder[0]);setText(document.querySelector('#apropos .found .np span'),founder[1]);var founderParas=document.querySelectorAll('#apropos .philo > p');founder.slice(2,5).forEach(function(value,i){setText(founderParas[i],value);});var signature=document.querySelector('#apropos .sig');if(signature){signature.textContent=founder[0]||'';var signatureRole=document.createElement('span');signatureRole.textContent=founder[1]||'';signature.appendChild(signatureRole);}
      if(data.about.timeline){var timeline=document.querySelector('#apropos .tl');if(timeline)timeline.innerHTML=data.about.timeline.map(function(values,i){return '<div class="tl-item" data-reveal style="--d:'+(i*.06)+'s"><span class="yr">'+esc(values[0])+'</span><h3>'+esc(values[1])+'</h3><p>'+esc(values[2])+'</p></div>';}).join('');}
      var mvv=data.about.mvv||[];document.querySelectorAll('#apropos .mvv-card').forEach(function(card,i){setText(card.querySelector('h3'),mvv[i*2]);setText(card.querySelector('p'),mvv[i*2+1]);});
    }

    var actorCards=Array.prototype.slice.call(document.querySelectorAll('.actor-grid .actor'));actorCards.forEach(function(card,i){if(!card.hasAttribute('data-sync-id'))card.setAttribute('data-sync-id',String(i+1));if((data.deletedActorIds||[]).indexOf(Number(card.getAttribute('data-sync-id')))>=0)card.remove();});
    (data.actors||[]).forEach(function(actor){var card=Array.prototype.slice.call(document.querySelectorAll('.actor-grid .actor')).find(function(el){return Number(el.getAttribute('data-sync-id'))===Number(actor.id);});if(!card&&Number(actor.id)>4){card=document.createElement('article');card.className='actor tilt';card.setAttribute('data-sync-id',actor.id);card.innerHTML='<div class="av"></div><div class="role"></div><h3></h3><p></p>';document.querySelector('.actor-grid').appendChild(card);}if(card){setText(card.querySelector('.role'),actor.role);setText(card.querySelector('h3'),actor.name);setText(card.querySelector('p'),actor.bio);var avatar=card.querySelector('.av');if(avatar){setText(avatar,actor.initials||String(actor.name||'').split(/\s+/).map(function(w){return w.charAt(0);}).join('').slice(0,2).toUpperCase());var image=safeImage(actor.image);if(image){avatar.style.backgroundImage='url("'+image.replace(/"/g,'%22')+'")';avatar.style.backgroundSize='cover';avatar.textContent='';}}}});

    if(data.admission){
      var process=document.querySelector('#renseignement .adm > div:first-child'),steps=data.admission.steps||[];
      if(process){var stepNodes=Array.prototype.slice.call(process.querySelectorAll('.vstep'));stepNodes.slice(steps.length).forEach(function(step){step.remove();});steps.forEach(function(values,i){var step=stepNodes[i];if(!step){step=document.createElement('div');step.className='vstep in';step.innerHTML='<div class="vn"></div><div><h3><span class="when"></span></h3><p></p></div>';process.appendChild(step);}step.querySelector('.vn').textContent=String(i+1);var heading=step.querySelector('h3'),when=heading&&heading.querySelector('.when');if(heading){if(heading.firstChild&&heading.firstChild.nodeType===3)heading.firstChild.textContent=values[0]||'';else heading.insertBefore(document.createTextNode(values[0]||''),when||null);setText(when,values[1]);}setText(step.querySelector('p'),values[2]);});}
      var admissionTitle=document.querySelector('#renseignement .s-head h2');if(admissionTitle)admissionTitle.innerHTML='Votre admission en <em>'+steps.length+' '+(steps.length===1?'étape':'étapes')+'</em>.';
      var list=document.querySelector('#renseignement .check-card ul');if(list&&data.admission.pieces){list.innerHTML=data.admission.pieces.map(function(item){return '<li><span class="ck"><svg class="icon"><use href="#i-check"/></svg></span> '+esc(item)+'</li>';}).join('');}
      var deadline=document.querySelector('#renseignement .deadline');if(deadline&&data.admission.deadline){var icon=deadline.querySelector('svg');deadline.textContent=' Campagne en cours : dépôts des dossiers jusqu’au '+data.admission.deadline;if(icon)deadline.insertBefore(icon,deadline.firstChild);}
    }
    if(data.settings){if(data.settings.title){document.title=data.settings.title;var titleTag=document.querySelector('title');if(titleTag)titleTag.textContent=data.settings.title;}if(data.settings.description){var meta=document.querySelector('meta[name="description"]');if(meta)meta.content=data.settings.description;}if(data.settings.colors){var root=document.documentElement;['--blue','--orange','--ink','--bg'].forEach(function(key,i){if(data.settings.colors[i])root.style.setProperty(key,data.settings.colors[i]);});}}
    if(data.display){
      document.querySelectorAll('.nl-box').forEach(function(el){el.hidden=data.display[1]===false;});
      document.querySelectorAll('[data-route="galerie"]').forEach(function(el){el.hidden=data.display[2]===false;});var galleryPage=document.getElementById('galerie');if(galleryPage)galleryPage.hidden=data.display[2]===false;
      document.querySelectorAll('[data-route="actualite"]').forEach(function(el){el.hidden=data.display[3]===false;});var newsPage=document.getElementById('actualite');if(newsPage)newsPage.hidden=data.display[3]===false;
      var form=document.getElementById('cform');if(form)form.hidden=data.display[4]===false;
      var faq=document.querySelector('#renseignement .faq');if(faq)faq.hidden=data.display[5]===false;
      if(data.display[0]===true&&!document.getElementById('maintenanceNotice')){var notice=document.createElement('div');notice.id='maintenanceNotice';notice.textContent='Le site est temporairement en maintenance. Merci de revenir bientôt.';notice.style.cssText='position:fixed;z-index:12000;inset:0;display:grid;place-items:center;padding:30px;background:#0e3a63;color:#fff;text-align:center;font:800 24px Manrope,Arial';document.body.appendChild(notice);}else if(data.display[0]===false){var maintenance=document.getElementById('maintenanceNotice');if(maintenance)maintenance.remove();}
    }
    var articles=activeArticles();window.ifgiPublicArticles.splice(0,window.ifgiPublicArticles.length);articles.forEach(function(a){window.ifgiPublicArticles.push(a);});renderArticles(articles);
  }

  function openGalleryItem(item){var modal=document.getElementById('lightbox');if(!modal)return;var image=safeImage(item.getAttribute('data-image'));var vis=document.getElementById('lbVis');vis.className='lb-vis '+(item.getAttribute('data-g')||'g1');if(image){vis.style.backgroundImage='url("'+image.replace(/"/g,'%22')+'")';vis.style.backgroundSize='cover';}else vis.style.backgroundImage='';document.getElementById('lbIcon').setAttribute('href','#'+(item.getAttribute('data-i')||'i-img'));setText(document.getElementById('lbTitle'),item.getAttribute('data-t'));setText(document.getElementById('lbDesc'),item.getAttribute('data-d'));setText(document.getElementById('lbCat'),item.getAttribute('data-cat'));modal.classList.add('open');document.body.style.overflow='hidden';}
  applyContent();
  window.addEventListener('storage',function(e){if(e.key===CONTENT_KEY||e.key===ARTICLE_KEY){articleState=read(ARTICLE_KEY,[]);applyContent();}});

  // Each public page opens the matching administration editor.
  var adminLink=document.querySelector('.admin-link');
  var panelByRoute={accueil:'page-accueil',filières:'filieres',galerie:'galerie',actualite:'actualites',renseignement:'contact',apropos:'apropos',article:'actualites'};
  function updateAdminLink(){if(!adminLink)return;var route=(location.hash||'#accueil').slice(1).split('-')[0];if(route==='article')route='article';var url=new URL('IFGI%20Admin%20%E2%80%94%20Panneau%20d%27Administration%20Complet.html',location.href);url.searchParams.set('panel',panelByRoute[route]||'dashboard');adminLink.href=url.href;}
  updateAdminLink();window.addEventListener('hashchange',updateAdminLink);

  // PWA install card. Installed mode hides it; after removal the browser can offer it again.
  var installStyle=document.createElement('style');
  installStyle.textContent='.pwa-install-card{position:fixed;z-index:10000;left:50%;bottom:calc(20px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(540px,calc(100% - 28px));box-sizing:border-box;display:flex;align-items:center;gap:14px;padding:15px 16px;border:1px solid #d6e5f4;border-radius:17px;background:#fff;box-shadow:0 16px 50px #0e3a6330;color:#17334e;font-family:Manrope,Arial,sans-serif}.pwa-install-card[hidden]{display:none}.pwa-install-mark{width:44px;height:44px;flex:0 0 44px;border-radius:13px;background:#0e3a63 url("icon-192.png") center/cover no-repeat}.pwa-install-copy{flex:1;min-width:0}.pwa-install-copy b{display:block;font-size:14px}.pwa-install-copy span{display:block;margin-top:3px;color:#64748b;font-size:12px;line-height:1.4}.pwa-install-action{border:0;border-radius:10px;padding:11px 14px;background:#f97e0d;color:white;font:800 13px Manrope,Arial;white-space:nowrap;cursor:pointer}.pwa-install-close{position:absolute;right:7px;top:5px;border:0;background:transparent;color:#64748b;font-size:20px;cursor:pointer}.admin-link{color:#ffd29f!important;font-weight:700}.f-bot{flex-wrap:wrap}@media(max-width:980px){.pwa-install-card{bottom:calc(92px + env(safe-area-inset-bottom))}}@media(max-width:540px){.pwa-install-card{align-items:flex-start;padding:17px 14px}.pwa-install-action{align-self:center;padding:10px}.pwa-install-copy b{font-size:13px}}';
  document.head.appendChild(installStyle);
  var installCard=document.createElement('aside');installCard.className='pwa-install-card';installCard.setAttribute('role','status');installCard.setAttribute('aria-live','polite');installCard.hidden=true;
  installCard.innerHTML='<div class="pwa-install-mark" aria-hidden="true"></div><div class="pwa-install-copy"><b>Installer l’application IFGI</b><span id="pwaInstallHint">Accédez au site depuis votre écran d’accueil, même hors connexion.</span></div><button class="pwa-install-action" id="pwaInstallButton" type="button">Installer</button><button class="pwa-install-close" id="pwaInstallClose" type="button" aria-label="Fermer">×</button>';
  document.body.appendChild(installCard);
  var installPrompt=null,installBtn=document.getElementById('pwaInstallButton'),hint=document.getElementById('pwaInstallHint');
  function isInstalled(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
  function showInstall(){installCard.hidden=isInstalled()||flagGet('ifgi.install.installed')==='1'||sessionStorage.getItem('ifgi.install.dismissed')==='1';}
  showInstall();
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();installPrompt=e;flagSet('ifgi.install.installed',null);hint.textContent='Installez l’application sur votre appareil en un geste.';showInstall();});
  window.addEventListener('appinstalled',function(){installPrompt=null;flagSet('ifgi.install.installed','1');installCard.hidden=true;sessionStorage.removeItem('ifgi.install.dismissed');});
  installBtn.addEventListener('click',async function(){
    if(installPrompt){installPrompt.prompt();var result=await installPrompt.userChoice;installPrompt=null;if(result&&result.outcome==='accepted')installCard.hidden=true;return;}
    hint.textContent=/iphone|ipad|ipod/i.test(navigator.userAgent)?'Dans Safari, touchez Partager puis « Sur l’écran d’accueil ».':'Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».';
    installBtn.textContent='Compris';installBtn.onclick=function(){installCard.hidden=true;};
  });
  document.getElementById('pwaInstallClose').addEventListener('click',function(){installCard.hidden=true;sessionStorage.setItem('ifgi.install.dismissed','1');});
  window.addEventListener('pageshow',showInstall);window.addEventListener('focus',showInstall);
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){navigator.serviceWorker.register('./sw.js').catch(function(){});}
})();
