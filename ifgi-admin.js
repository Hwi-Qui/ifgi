(function () {
  'use strict';

  var CONTENT_KEY = 'ifgi.site.content.v1';
  var ARTICLE_KEY = 'ifgi.site.articles.v1';
  var AUTH_KEY = 'ifgi.admin.credentials.v1';
  var AUTH_SESSION = 'ifgi.admin.session.v1';
  var state = read(CONTENT_KEY, {});
  var overrides = read(ARTICLE_KEY, []);
  var currentArticle = null;
  var pendingDelete = null;
  var editingGalleryItem = null;
  var categories = { Campus: 'campus', Ateliers: 'ateliers', Laboratoires: 'labos', Événements: 'events' };
  var authStyle=document.createElement('style');
  authStyle.textContent='#adminAuth{position:fixed;z-index:99999;inset:0;display:grid;place-items:center;padding:22px;background:linear-gradient(135deg,#081f39 0%,#0e3a63 55%,#1261a6 100%);font-family:Manrope,Arial,sans-serif}#adminAuth[hidden]{display:none}.admin-auth-card{box-sizing:border-box;width:min(440px,100%);padding:34px;border-radius:22px;background:#fff;box-shadow:0 24px 80px #00152e66;display:flex;flex-direction:column;gap:12px}.admin-auth-mark{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#f97e0d;color:#fff;font:800 27px Sora,Arial}.admin-auth-kicker{margin:6px 0 0;color:#f97e0d;font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase}.admin-auth-card h1{font:800 24px Sora,Arial;color:#102a43;margin:0}.admin-auth-card p{color:#64748b;font-size:13px;margin:0 0 8px}.admin-auth-card label{font-size:12px;font-weight:700;color:#233a50;margin-top:5px}.admin-auth-card input{box-sizing:border-box;width:100%;border:1px solid #d8e1ec;border-radius:10px;padding:12px;font:inherit}.admin-auth-card input:focus{outline:2px solid #9bcaff;border-color:#1473c9}.admin-auth-card button{margin-top:7px;border:0;border-radius:10px;padding:13px;background:#0f62ac;color:#fff;font:700 14px Manrope,Arial;cursor:pointer}.admin-auth-card button:disabled{opacity:.6}.admin-auth-card small{color:#64748b;font-size:11px;line-height:1.5}.admin-auth-card #adminAuthError{color:#b42318;min-height:16px;font-weight:700}body:not(.admin-authenticated){overflow:hidden}';
  document.head.appendChild(authStyle);

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { window.toast('Stockage plein : réduisez la taille des images.', 'error'); return false; }
  }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function text(el) { return el ? el.value.trim() : ''; }
  function elements(root, selector) { return root ? Array.prototype.slice.call(root.querySelectorAll(selector)) : []; }
  function setValues(nodes, values) { (values || []).forEach(function (value, i) { if (nodes[i]) nodes[i].value = value; }); }
  elements(document.getElementById('filieresGrid'),'.filiere-card').forEach(function(card,i){if(!card.hasAttribute('data-sync-id'))card.setAttribute('data-sync-id',String(i+1));});
  elements(document.getElementById('acteursList'),'.acteur-card').forEach(function(card,i){if(!card.hasAttribute('data-sync-id'))card.setAttribute('data-sync-id',String(i+1));});
  elements(document.getElementById('galGrid'),'.gal-item').forEach(function(item,i){if(!item.hasAttribute('data-sync-id'))item.setAttribute('data-sync-id',String([1,2,3,6,5][i]||i+1));});
  elements(document.querySelector('#panel-contact #admissionSteps'),':scope > div > div').filter(function(row){return row.querySelector('.form-grid');}).forEach(function(row){row.classList.add('admission-step');});

  function collectContent() {
    var next = Object.assign({}, state);
    var home = document.querySelector('#panel-page-accueil .page-blocks');
    var blocks = elements(home, '.page-block');
    if (blocks[0]) {
      var fields = elements(blocks[0].querySelector('.pb-body'), '.form-grid:first-of-type input');
      var hero = elements(blocks[0].querySelector('.pb-body'), 'input[type="text"],textarea');
      var separator=blocks[0].querySelector('.pb-body .sep');var statsGrid=separator&&separator.nextElementSibling?separator.nextElementSibling.nextElementSibling:null;
      var stats = statsGrid ? elements(statsGrid, 'input') : [];
      next.hero = {
        line1: text(hero[0]), gradient: text(hero[1]), line2: text(hero[2]), description: text(hero[3]),
        button: text(hero[4]), location: text(hero[5]), chips: hero.slice(6, 10).map(text),
        stats: stats.map(text), enabled: !!blocks[0].querySelector('.pb-head .switch input')?.checked
      };
    }
    if (blocks[1]) next.marquee = text(blocks[1].querySelector('input'));
    if(blocks[2]){var homeVideo=elements(blocks[2],'input[type="text"],textarea');next.homeVideo={id:text(homeVideo[0]),playLabel:text(homeVideo[1]),benefits:text(homeVideo[2])};}
    var videoFields=elements(document.querySelector('#panel-videos .card .card-body .form-grid'),'input[type="text"]');next.video={id:text(videoFields[0]),title:text(videoFields[1]),subtitle:text(videoFields[2])};

    var oldPrograms=state.programs||[];
    next.programs = elements(document.getElementById('filieresGrid'), '.filiere-card').map(function (card, i) {
      var input = card.querySelector('input[type="text"]');
      var tags = elements(card, '.form-grid input').map(text).filter(Boolean);
      var enabled=card.querySelector('.filiere-header .switch input');
      return { id: Number(card.getAttribute('data-sync-id'))||i+1, code:card.querySelector('.filiere-header > div > div')?.textContent.trim()||'', title: text(input), description: text(card.querySelector('textarea')), tags: tags, enabled:!enabled||enabled.checked };
    });
    next.deletedProgramIds=Array.from(new Set((state.deletedProgramIds||[]).concat(oldPrograms.map(function(p){return Number(p.id);}).filter(function(id){return !next.programs.some(function(p){return Number(p.id)===id;});}))));

    next.gallery = elements(document.getElementById('galGrid'), '.gal-item').map(function (item, i) {
      var label = item.querySelector('.gal-label');
      var small = label && label.querySelector('small');
      var title = item.getAttribute('data-t') || (label && label.querySelector('b') ? label.querySelector('b').textContent : (label ? label.childNodes[0].textContent.trim() : ''));
      return { id: Number(item.getAttribute('data-sync-id')) || [1,2,3,6,5][i] || (i + 1), title: title,
        category: (small ? small.textContent.trim() : item.getAttribute('data-cat')) || 'Campus',
        description: item.getAttribute('data-d') || '', image: item.getAttribute('data-image') || '' };
    });
    next.deletedGalleryIds=Array.from(new Set((state.deletedGalleryIds||[]).concat((state.gallery||[]).map(function(g){return Number(g.id);}).filter(function(id){return !next.gallery.some(function(g){return Number(g.id)===id;});}))));

    var contact = document.querySelector('#panel-contact .two-col > div:first-child .card .card-body');
    var contactInputs = elements(contact, 'input,textarea');
    next.contact = { address:text(contactInputs[0]), phone1:text(contactInputs[1]), phone2:text(contactInputs[2]), email:text(contactInputs[3]), hours:text(contactInputs[4]), map:text(contactInputs[5]) };
    var socialCard=elements(document.querySelector('#panel-contact .two-col > div:first-child'),'.card')[1];
    next.social= socialCard ? elements(socialCard,'input').map(text) : [];

    var oldActors=state.actors||[];
    next.actors=elements(document.getElementById('acteursList'),'.acteur-card').map(function(card,i){var fields=elements(card,'input[type="text"],textarea');var avatar=card.querySelector('.acteur-av div');return {id:Number(card.getAttribute('data-sync-id'))||i+1,role:text(fields[0]),name:text(fields[1]),bio:text(fields[2]),image:card.getAttribute('data-image')||'',initials:avatar?avatar.textContent.trim():''};});
    next.deletedActorIds=Array.from(new Set((state.deletedActorIds||[]).concat(oldActors.map(function(a,i){return Number(a.id)||i+1;}).filter(function(id){return !next.actors.some(function(a){return Number(a.id)===id;});}))));

    var aboutBlocks = elements(document.querySelector('#panel-apropos .page-blocks'), '.page-block');
    if (aboutBlocks[0]) {
      var fieldsAbout = elements(aboutBlocks[0], 'input[type="text"],textarea');
      next.about = Object.assign({}, next.about || {}, { founder: fieldsAbout.map(text) });
    }
    if (aboutBlocks[1]) next.about.timeline = elements(aboutBlocks[1], '.tl-row').map(function (row) { return elements(row, 'input,textarea').map(text); });
    if (aboutBlocks[2]) next.about.mvv = elements(aboutBlocks[2], 'input[type="text"],textarea').map(text);

    var settingCards=elements(document.querySelector('#panel-settings .two-col > div:first-child'),'.card');
    if(settingCards[0]){var general=elements(settingCards[0],'input[type="text"]');next.settings={name:text(general[0]),acronym:text(general[1]),slogan:text(general[2]),brand:text(general[3]),title:text(general[4]),description:text(settingCards[0].querySelector('textarea')),colors:settingCards[1]?elements(settingCards[1],'input[type="color"]').map(text):[]};}
    var displayCard=elements(document.querySelector('#panel-settings .two-col > div:nth-child(2)'),'.card').find(function(card){var h=card.querySelector('.card-header h3');return h&&h.textContent.indexOf('Options d')>=0;});
    next.display=displayCard?elements(displayCard,'input[type="checkbox"]').map(function(input){return input.checked;}):[];

    var admission = document.querySelector('#panel-contact #admissionSteps');
    next.admission = {
      steps: elements(admission, ':scope > div > div').filter(function (row) { return row.querySelector('.form-grid'); }).map(function (row) { return elements(row, '.form-grid input,.form-grid textarea').map(text); }),
      pieces: elements(document.getElementById('piecesList'), 'input').map(text).filter(Boolean),
      deadline: text(document.querySelector('#panel-contact input[value*="septembre"]'))
    };
    return next;
  }

  function applyContent(data) {
    if (!data) return;
    var home = document.querySelector('#panel-page-accueil .page-blocks');
    var blocks = elements(home, '.page-block');
    if (data.hero && blocks[0]) {
      var fields = elements(blocks[0].querySelector('.pb-body'), 'input[type="text"],textarea');
      setValues(fields, [data.hero.line1,data.hero.gradient,data.hero.line2,data.hero.description,data.hero.button,data.hero.location].concat(data.hero.chips || []));
      var separator=blocks[0].querySelector('.pb-body .sep');var statsGrid=separator&&separator.nextElementSibling?separator.nextElementSibling.nextElementSibling:null;setValues(elements(statsGrid, 'input'), data.hero.stats || []);
    }
    if (data.marquee && blocks[1]) setValues(elements(blocks[1], 'input'), [data.marquee]);
    if(data.homeVideo&&blocks[2])setValues(elements(blocks[2],'input[type="text"],textarea'),[data.homeVideo.id,data.homeVideo.playLabel,data.homeVideo.benefits]);
    if(data.video){var videoFields=elements(document.querySelector('#panel-videos .card .card-body .form-grid'),'input[type="text"]');setValues(videoFields,[data.video.id,data.video.title,data.video.subtitle]);}
    elements(document.getElementById('filieresGrid'),'.filiere-card').forEach(function(card){if((data.deletedProgramIds||[]).indexOf(Number(card.getAttribute('data-sync-id')))>=0)card.remove();});
    (data.programs || []).forEach(function (p, i) {
      var card = elements(document.getElementById('filieresGrid'), '.filiere-card').find(function(el){return Number(el.getAttribute('data-sync-id'))===Number(p.id);});
      if(!card&&Number(p.id)>6){card=createProgramCard(p);document.getElementById('filieresGrid').appendChild(card);}
      if (card) { var input=card.querySelector('input[type="text"]'); if(input)input.value=p.title||'';var code=card.querySelector('.filiere-header > div > div');if(code&&p.code)code.textContent=p.code; var desc=card.querySelector('textarea');if(desc)desc.value=p.description||''; setValues(elements(card,'.form-grid input'),p.tags||[]);var enabled=card.querySelector('.filiere-header .switch input');if(enabled&&p.enabled!=null)enabled.checked=p.enabled; }
    });
    (data.deletedGalleryIds||[]).forEach(function(id){var item=elements(document.getElementById('galGrid'),'.gal-item').find(function(el){return Number(el.getAttribute('data-sync-id'))===Number(id);});if(item)item.remove();});
    (data.gallery || []).forEach(function (g) {
      var item = elements(document.getElementById('galGrid'), '.gal-item').find(function (el) { return Number(el.getAttribute('data-sync-id')) === Number(g.id); }) || elements(document.getElementById('galGrid'), '.gal-item')[({1:0,2:1,3:2,6:3,5:4})[g.id]];
      if(!item&&Number(g.id)>12){item=document.createElement('div');item.className='gal-item';item.innerHTML='<div style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,var(--blue),#2f83c9)"><svg class="ico20"><use href="#i-img"/></svg></div><div class="gal-overlay"><button class="h-btn h-btn-ghost" onclick="openEditGalItem(this)">Modifier</button><button class="h-btn" onclick="confirmDelete(\'cet élément galerie\')">Supprimer</button></div><div class="gal-label"><b></b><small></small></div><span class="gal-type">📷</span>';document.getElementById('galGrid').appendChild(item);}
      if (item) renderGalleryAdmin(item, g);
    });
    if (data.contact) {
      var form = document.querySelector('#panel-contact .two-col > div:first-child .card .card-body');
      setValues(elements(form, 'input,textarea'), [data.contact.address,data.contact.phone1,data.contact.phone2,data.contact.email,data.contact.hours,data.contact.map]);
    }
    if(data.social){var socialCard=elements(document.querySelector('#panel-contact .two-col > div:first-child'),'.card')[1];if(socialCard)setValues(elements(socialCard,'input'),data.social);}
    elements(document.getElementById('acteursList'),'.acteur-card').forEach(function(card){if((data.deletedActorIds||[]).indexOf(Number(card.getAttribute('data-sync-id')))>=0)card.remove();});
    (data.actors||[]).forEach(function(actor){var card=elements(document.getElementById('acteursList'),'.acteur-card').find(function(el){return Number(el.getAttribute('data-sync-id'))===Number(actor.id);});if(!card&&Number(actor.id)>4){card=createActorCard(actor);document.getElementById('acteursList').appendChild(card);}if(card){var fields=elements(card,'input[type="text"],textarea');setValues(fields,[actor.role,actor.name,actor.bio]);var avatar=card.querySelector('.acteur-av div');if(avatar){avatar.textContent=String(actor.initials||actor.name||'?').slice(0,2).toUpperCase();if(actor.image){card.setAttribute('data-image',actor.image);avatar.style.backgroundImage='url("'+actor.image.replace(/"/g,'%22')+'")';avatar.style.backgroundSize='cover';avatar.textContent='';}}}});
    if (data.about) {
      var aboutBlocks=elements(document.querySelector('#panel-apropos .page-blocks'),'.page-block');
      if(aboutBlocks[0])setValues(elements(aboutBlocks[0],'input[type="text"],textarea'),data.about.founder||[]);
      if(aboutBlocks[1]){
        var timeline=document.getElementById('timelineEditor');var rows=elements(timeline,'.tl-row');
        rows.slice((data.about.timeline||[]).length).forEach(function(row){row.remove();});
        (data.about.timeline||[]).forEach(function(values,i){var row=elements(timeline,'.tl-row')[i];if(!row){row=document.createElement('div');row.className='tl-row';row.innerHTML='<div class="tl-drag-handle">⠿</div><div class="tl-fields"><input type="text" placeholder="LABEL"><input type="text" placeholder="Titre de l’étape"><textarea rows="2" placeholder="Description…"></textarea></div><button class="act-btn del" onclick="confirmDelete(\'cette étape\')"><svg class="ico16"><use href="#i-trash"/></svg></button>';timeline.appendChild(row);}setValues(elements(row,'input,textarea'),values);});
      }
      if(aboutBlocks[2])setValues(elements(aboutBlocks[2],'input[type="text"],textarea'),data.about.mvv||[]);
    }
    if(data.settings){var settingCards=elements(document.querySelector('#panel-settings .two-col > div:first-child'),'.card');if(settingCards[0]){var general=elements(settingCards[0],'input[type="text"]');setValues(general,[data.settings.name,data.settings.acronym,data.settings.slogan,data.settings.brand,data.settings.title]);var desc=settingCards[0].querySelector('textarea');if(desc)desc.value=data.settings.description||'';}if(settingCards[1])setValues(elements(settingCards[1],'input[type="color"]'),data.settings.colors||[]);}
    if(data.display){var displayCard=elements(document.querySelector('#panel-settings .two-col > div:nth-child(2)'),'.card').find(function(card){var h=card.querySelector('.card-header h3');return h&&h.textContent.indexOf('Options d')>=0;});if(displayCard)elements(displayCard,'input[type="checkbox"]').forEach(function(input,i){if(data.display[i]!=null)input.checked=data.display[i];});}
    if (data.admission) {
      var rows=elements(document.querySelector('#panel-contact #admissionSteps'),':scope > div > div').filter(function(row){return row.querySelector('.form-grid');});var admissionList=document.querySelector('#panel-contact #admissionSteps > div');
      rows.slice((data.admission.steps||[]).length).forEach(function(row){row.remove();});
      (data.admission.steps||[]).forEach(function(values,i){var row=elements(admissionList,':scope > div')[i];if(!row){row=createAdmissionStep(values,i);admissionList.appendChild(row);}row.classList.add('admission-step');setValues(elements(row,'.form-grid input,.form-grid textarea'),values);if(row.firstElementChild)row.firstElementChild.textContent=String(i+1);});
      var pieces=document.getElementById('piecesList');var pieceRows=elements(pieces,'.flex-row');pieceRows.slice((data.admission.pieces||[]).length).forEach(function(row){row.remove();});
      (data.admission.pieces||[]).forEach(function(value,i){var row=elements(pieces,'.flex-row')[i];if(!row){row=document.createElement('div');row.className='flex-row';row.innerHTML='<input type="text" style="flex:1;padding:8px 11px;border:1.5px solid var(--line);border-radius:8px;font-size:13px"><button class="act-btn del" onclick="this.parentElement.remove()"><svg class="ico16"><use href="#i-trash"/></svg></button>';pieces.appendChild(row);}var input=row.querySelector('input');if(input)input.value=value;});
    }
  }

  function saveContent(notify) {
    state = collectContent();
    if (!write(CONTENT_KEY, state)) return false;
    if (notify !== false) window.toast('Contenu enregistré. Le site public est à jour.', 'success');
    return true;
  }

  function renderGalleryAdmin(item, data) {
    item.setAttribute('data-sync-id', data.id);
    item.setAttribute('data-cat', categories[data.category] || String(data.category || 'campus').toLowerCase());
    item.setAttribute('data-t', data.title || ''); item.setAttribute('data-d', data.description || '');
    if (data.image) item.setAttribute('data-image', data.image); else item.removeAttribute('data-image');
    var label=item.querySelector('.gal-label');
    if(label) label.innerHTML='<b>'+esc(data.title)+'</b><small>'+esc(data.category)+'</small>';
    var visual=item.querySelector(':scope > div:first-child');
    if(visual && data.image) visual.style.cssText='width:100%;height:100%;background: center/cover no-repeat url("'+data.image.replace(/"/g,'%22')+'");';
    else if(visual) visual.style.removeProperty('background-image');
  }

  function createProgramCard(program){
    var card=document.createElement('div');card.className='filiere-card';card.setAttribute('data-sync-id',program.id);
    card.innerHTML='<div class="filiere-header"><div class="filiere-icon"><svg class="ico20"><use href="#i-grad"/></svg></div><div><div style="font-size:11px;font-weight:800;color:var(--blue);letter-spacing:1px"></div><input type="text" style="border:none;font-size:15px;font-weight:700;font-family:Sora;width:100%;outline:none;background:transparent;color:var(--ink)"></div><label class="switch" style="margin-left:auto"><input type="checkbox" checked><span class="slider"></span></label></div><textarea rows="3" style="border:1.5px solid var(--line);border-radius:8px;padding:8px;font-size:13px;width:100%;font-family:inherit;resize:none"></textarea><div class="form-grid mt8" style="grid-template-columns:1fr 1fr"><input type="text" placeholder="Tag 1"><input type="text" placeholder="Tag 2"></div><div class="flex-row mt8" style="justify-content:flex-end;gap:6px"><button class="act-btn del" onclick="confirmDelete(\'cette filière\')"><svg class="ico16"><use href="#i-trash"/></svg></button></div>';
    var fields=elements(card,'input[type="text"],textarea');card.querySelector('.filiere-header > div > div').textContent=program.code||'';fields[0].value=program.title||'';fields[1].value=program.description||'';setValues(elements(card,'.form-grid input'),program.tags||[]);return card;
  }
  function createActorCard(actor){
    var card=document.createElement('div');card.className='acteur-card';card.setAttribute('data-sync-id',actor.id);
    card.innerHTML='<div class="acteur-av"><div style="width:52px;height:52px;background:linear-gradient(135deg,var(--blue),#3f8bd4);display:grid;place-items:center;font-family:Sora;font-weight:800;font-size:18px;color:#fff;border-radius:14px"></div></div><div style="flex:1"><div class="form-grid" style="margin-bottom:0"><div class="fg"><label style="font-size:11px">Rôle / Fonction</label><input type="text" style="font-size:12.5px;padding:6px 9px"></div><div class="fg"><label style="font-size:11px">Nom complet</label><input type="text" style="font-size:13px;font-weight:700;padding:6px 9px"></div><div class="fg span2"><label style="font-size:11px">Témoignage / Bio courte</label><textarea rows="2" style="font-size:12.5px;padding:6px 9px"></textarea></div></div></div><div style="display:flex;flex-direction:column;gap:6px"><button class="act-btn edit" title="Modifier"><svg class="ico16"><use href="#i-edit"/></svg></button><button class="act-btn del" onclick="confirmDelete(\'cet acteur\')"><svg class="ico16"><use href="#i-trash"/></svg></button></div>';
    setValues(elements(card,'input[type="text"],textarea'),[actor.role,actor.name,actor.bio]);var avatar=card.querySelector('.acteur-av div');avatar.textContent=String(actor.initials||actor.name||'?').slice(0,2).toUpperCase();if(actor.image){card.setAttribute('data-image',actor.image);avatar.style.backgroundImage='url("'+actor.image.replace(/"/g,'%22')+'")';avatar.style.backgroundSize='cover';avatar.textContent='';}return card;
  }
  function createAdmissionStep(values,index){
    var row=document.createElement('div');row.className='admission-step';row.style.cssText='display:flex;align-items:flex-start;gap:10px';
    row.innerHTML='<div style="width:28px;height:28px;border-radius:9px;background:var(--blue);color:#fff;display:grid;place-items:center;font-family:Sora;font-weight:800;font-size:13px;flex-shrink:0">'+(index+1)+'</div><div style="flex:1"><div class="form-grid" style="margin-bottom:0"><input type="text" placeholder="Titre de l’étape" style="padding:7px 10px;border:1.5px solid var(--line);border-radius:8px;font-size:13px;font-weight:700"><input type="text" placeholder="Période" style="padding:7px 10px;border:1.5px solid var(--line);border-radius:8px;font-size:12.5px"><div class="fg span2"><textarea rows="2" style="font-size:12.5px"></textarea></div></div></div><button class="act-btn del" onclick="confirmDelete(\'cette étape\')"><svg class="ico16"><use href="#i-trash"/></svg></button>';
    setValues(elements(row,'.form-grid input,.form-grid textarea'),values||[]);return row;
  }
  // Authentification locale : utile sur un site statique, mais à remplacer par un serveur pour protéger un vrai déploiement.
  var authLayer=document.getElementById('adminAuth'), authForm=document.getElementById('adminAuthForm');
  var authUser=document.getElementById('adminAuthUser'), authPass=document.getElementById('adminAuthPass');
  var authIntro=document.getElementById('adminAuthIntro'), authSubmit=document.getElementById('adminAuthSubmit'), authError=document.getElementById('adminAuthError');
  function authRecord(){return read(AUTH_KEY,null);}
  function updateAuthScreen(){var record=authRecord(),has=!!record;if(record)authUser.value=record.user;authIntro.textContent=has?'Connectez-vous pour gérer le site.':'Créez le premier accès administrateur. Choisissez un mot de passe d’au moins 10 caractères.';authSubmit.textContent=has?'Se connecter':'Créer mon accès';authPass.autocomplete=has?'current-password':'new-password';}
  async function digest(password,salt){
    if(!window.crypto||!crypto.subtle)throw new Error('La connexion sécurisée nécessite un navigateur récent.');
    var enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
    var bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:120000,hash:'SHA-256'},key,256);
    return Array.from(new Uint8Array(bits)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }
  function unlock(){document.body.classList.add('admin-authenticated');authLayer.hidden=true;sessionStorage.setItem(AUTH_SESSION,'1');}
  function lock(){document.body.classList.remove('admin-authenticated');authLayer.hidden=false;authPass.value='';updateAuthScreen();authPass.focus();}
  if(sessionStorage.getItem(AUTH_SESSION)==='1'&&authRecord())unlock();else lock();
  updateAuthScreen();
  var authCard=elements(document,'#panel-settings .card').find(function(card){var h=card.querySelector('.card-header h3');return h&&h.textContent.indexOf('Accès administrateur')>=0;});
  if(authCard){
    var authFields=elements(authCard,'input');var authRecordNow=authRecord();if(authFields[0]&&authRecordNow)authFields[0].value=authRecordNow.user;
    var changeButton=elements(authCard,'button').find(function(btn){return btn.textContent.toLowerCase().indexOf('mettre à jour')>=0;});
    if(changeButton){changeButton.removeAttribute('onclick');changeButton.addEventListener('click',async function(){
      var user=(authFields[0]&&authFields[0].value||'').trim().toLowerCase(),pass=authFields[1]&&authFields[1].value||'',confirmPass=authFields[2]&&authFields[2].value||'';
      if(!user){window.toast('Indiquez une adresse e-mail.','error');return;}
      if(!pass||pass.length<10||pass!==confirmPass){window.toast('Vérifiez les deux mots de passe (10 caractères minimum).','error');return;}
      var salt=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
      try{localStorage.setItem(AUTH_KEY,JSON.stringify({user:user,salt:salt,hash:await digest(pass,salt)}));authUser.value=user;authFields[1].value='';authFields[2].value='';window.toast('Accès administrateur mis à jour.','success');}
      catch(err){window.toast(err.message||'Impossible de modifier l’accès.','error');}
    });}
  }
  authForm.addEventListener('submit',async function(e){
    e.preventDefault();authError.textContent='';authSubmit.disabled=true;
    try{
      var user=authUser.value.trim().toLowerCase(),pass=authPass.value,record=authRecord();
      if(!record){if(pass.length<10)throw new Error('Le mot de passe doit contenir au moins 10 caractères.');var salt=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function(b){return b.toString(16).padStart(2,'0');}).join('');record={user:user,salt:salt,hash:await digest(pass,salt)};localStorage.setItem(AUTH_KEY,JSON.stringify(record));}
      else if(user!==record.user||await digest(pass,record.salt)!==record.hash)throw new Error('Adresse e-mail ou mot de passe incorrect.');
      unlock();authPass.value='';
    }catch(err){authError.textContent=err.message||'Connexion impossible.';}
    finally{authSubmit.disabled=false;}
  });

  function logout(){sessionStorage.removeItem(AUTH_SESSION);lock();}
  document.addEventListener('click',function(e){var logoutBtn=e.target.closest('#logoutBtn');if(logoutBtn){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(confirm('Déconnecter l’administrateur ?'))logout();return;}},true);

  function adminPanelForSite(){var active=document.querySelector('.nav-item[data-panel].active');var id=active&&active.getAttribute('data-panel');return ({actualites:'actualite',galerie:'galerie',videos:'galerie','page-accueil':'accueil',filieres:'accueil',acteurs:'apropos',apropos:'apropos',contact:'renseignement',settings:'apropos',dashboard:'accueil'})[id]||'accueil';}
  var viewBtn=document.getElementById('viewSiteBtn');if(viewBtn){viewBtn.removeAttribute('onclick');viewBtn.addEventListener('click',function(){var url=new URL('IFGI_site_v2%20(1).html',location.href);url.hash=adminPanelForSite();window.open(url.href,'_blank','noopener');});}

  // Restore the editable forms from the last publish.
  applyContent(state);

  // Saving a page now publishes its editable fields to the public site.
  elements(document, '#globalSaveBtn,#panel-page-accueil button,#panel-galerie button,#panel-videos button,#panel-filieres button,#panel-acteurs button,#panel-apropos button,#panel-contact button,#panel-settings button').forEach(function(btn){
    if(btn.closest('.modal-overlay')||btn.id==='logoutBtn')return;
    var label=btn.textContent.trim().toLowerCase();
    if(label.includes('sauvegarder')||btn.id==='globalSaveBtn'){
      btn.removeAttribute('onclick');btn.addEventListener('click',function(e){e.preventDefault();saveContent(true);});
    }
  });

  // Admin-created content uses the same browser storage as the public site.
  var baseArticles=window.ifgiAdminArticles||[];
  var articleIds=[1,2,3,4,5,7];
  var initialCategories=['Événement','Concours','Infrastructures','Vie scolaire','Formations','Innovation'];
  var initialDates=['2026-10-28','2026-10-28','2026-10-05','2026-09-15','2026-08-22','2026-06-18'];
  var articleRecords=baseArticles.map(function(a,i){return Object.assign({id:articleIds[i]||8+i,published:i!==5,cat:initialCategories[i]||'Actualité',author:'Cellule Communication IFGI',date:initialDates[i]||new Date().toISOString().slice(0,10)},a);});
  overrides.forEach(function(o){var idx=articleRecords.findIndex(function(a){return a.id===o.id;});if(idx>=0)articleRecords[idx]=Object.assign(articleRecords[idx],o);else articleRecords.push(o);});
  articleRecords=articleRecords.filter(function(a){return !a.deleted;});
  function renderArticleTable(){
    var body=document.getElementById('articlesBody');if(!body)return;
    body.innerHTML=articleRecords.map(function(a,i){var date=a.date||'';return '<tr data-id="'+i+'"><td><div class="td-flex"><div class="td-img" style="background:var(--blue-100);color:var(--blue)">IF</div><div><div class="td-name">'+esc(a.title)+'</div><div class="td-sub">'+esc(a.desc||'')+'</div></div></div></td><td><span class="badge badge-blue">'+esc(a.cat||'Actualité')+'</span></td><td>'+esc(a.author||'Cellule Communication')+'</td><td>'+esc(date)+'</td><td><span class="badge '+(a.published?'badge-gr':'badge-muted')+'">'+(a.published?'Publié':'Brouillon')+'</span></td><td><div class="row-actions"><button class="act-btn view" onclick="openPublicArticle('+Number(a.id)+')" title="Voir sur le site">↗</button><button class="act-btn edit" onclick="openEditArticle('+i+')" title="Modifier">✎</button><button class="act-btn del" onclick="confirmDelete(\'cet article\')" title="Supprimer">×</button></div></td></tr>';}).join('');
  }
  window.openPublicArticle=function(id){var url=new URL('IFGI_site_v2%20(1).html',location.href);url.hash='article-'+Number(id);window.open(url.href,'_blank','noopener');};
  window.openEditArticle=function(index){currentArticle=index;var a=articleRecords[index];if(!a)return;document.getElementById('artTitle').value=a.title||'';document.getElementById('artDesc').value=a.desc||'';document.getElementById('richEditor').innerHTML=a.content||'<p></p>';var cat=document.querySelector('#tab-editeur .two-col > div:nth-child(2) .card:nth-of-type(2) select');if(cat&&a.cat)cat.value=a.cat;var author=document.querySelector('#tab-editeur .two-col > div:nth-child(2) .card:nth-of-type(2) input[type="text"]');if(author&&a.author)author.value=a.author;var status=document.querySelector('#tab-editeur .two-col > div:nth-child(2) .card:first-child select');if(status)status.value=a.published?'Publié':'Brouillon';var date=document.querySelector('#tab-editeur input[type="datetime-local"]');if(date&&a.date)date.value=a.date+'T10:00';var tab=document.querySelector('.tab-btn[data-tab="tab-editeur"]');if(tab)tab.click();window.switchPanel('actualites');};
  window.openNewArticle=function(){currentArticle=articleRecords.length;articleRecords.push({id:Math.max.apply(null,[7].concat(articleRecords.map(function(a){return a.id||0;})))+1,title:'',desc:'',cat:'Actualité',author:'Cellule Communication',date:new Date().toISOString().slice(0,10),content:'<p></p>',published:false});window.openEditArticle(currentArticle);};
  window.saveCurrentArticle=function(published){if(currentArticle==null)return;var a=articleRecords[currentArticle];a.title=text(document.getElementById('artTitle'));a.desc=text(document.getElementById('artDesc'));a.content=document.getElementById('richEditor').innerHTML;var cat=document.querySelector('#tab-editeur .two-col > div:nth-child(2) .card:nth-of-type(2) select');if(cat)a.cat=cat.value;var author=document.querySelector('#tab-editeur .two-col > div:nth-child(2) .card:nth-of-type(2) input[type="text"]');if(author&&author.value)a.author=author.value;var date=document.querySelector('#tab-editeur input[type="datetime-local"]');if(date&&date.value)a.date=date.value.slice(0,10);var time=document.getElementById('artReadTime');if(time&&time.value)a.min=time.value;a.published=!!published;if(!a.title){window.toast('Ajoutez un titre avant de publier.','error');return;}overrides=overrides.filter(function(o){return o.id!==a.id;});overrides.push(a);if(write(ARTICLE_KEY,overrides)){renderArticleTable();window.toast(published?'Article publié sur le site.':'Brouillon enregistré.','success');}};
  var articleButtons=elements(document.querySelector('#tab-editeur'),'.h-btn');articleButtons.forEach(function(btn){var label=btn.textContent.toLowerCase();if(label.includes('brouillon')){btn.removeAttribute('onclick');btn.addEventListener('click',function(){window.saveCurrentArticle(false);});}else if(label.includes('publier')){btn.removeAttribute('onclick');btn.addEventListener('click',function(){window.saveCurrentArticle(true);});}});
  renderArticleTable();

  // Gallery edit and add actions persist titles, categories, descriptions and resized pictures.
  window.openEditGalItem=function(btn){editingGalleryItem=btn.closest('.gal-item');var item=editingGalleryItem;document.getElementById('editGalTitle').value=item.getAttribute('data-t')||'';document.getElementById('editGalDesc').value=item.getAttribute('data-d')||'';var cat=document.getElementById('editGalCat');if(cat)cat.value=Object.keys(categories).find(function(k){return categories[k]===item.getAttribute('data-cat');})||'Campus';window.openModal('modalEditGal');};
  function compressImage(file){return new Promise(function(resolve,reject){var img=new Image(),url=URL.createObjectURL(file);img.onload=function(){var scale=Math.min(1,1000/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/jpeg',.72));};img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('Image illisible'));};img.src=url;});}
  var editGalSave=document.querySelector('#modalEditGal .modal-foot .h-btn-blue');if(editGalSave){editGalSave.removeAttribute('onclick');editGalSave.addEventListener('click',async function(){if(!editingGalleryItem)return;var image=editingGalleryItem.getAttribute('data-image')||'';var file=document.getElementById('editGalImg').files[0];if(file){try{image=await compressImage(file);}catch(_){} }renderGalleryAdmin(editingGalleryItem,{id:Number(editingGalleryItem.getAttribute('data-sync-id'))||1,title:text(document.getElementById('editGalTitle')),description:text(document.getElementById('editGalDesc')),category:document.getElementById('editGalCat').value,image:image});window.closeModal('modalEditGal');saveContent(false);window.toast('Élément galerie mis à jour sur le site.','success');});}
  var addGalSave=document.querySelector('#modalAddGal .modal-foot .h-btn-blue');if(addGalSave){addGalSave.removeAttribute('onclick');addGalSave.addEventListener('click',async function(){var form=document.querySelector('#tab-add-photo .form-grid');var title=text(form&&form.querySelector('input'));var desc=text(form&&form.querySelector('textarea'));var category=form&&form.querySelector('select')?form.querySelector('select').value:'Campus';var files=Array.prototype.slice.call(document.getElementById('galPhotoInput').files||[]).slice(0,5);if(!title&&!files.length){window.toast('Ajoutez un titre ou une image.','error');return;}for(var i=0;i<Math.max(files.length,1);i++){var image='';if(files[i])try{image=await compressImage(files[i]);}catch(_){}var item=document.createElement('div');item.className='gal-item';item.innerHTML='<div style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,var(--blue),#2f83c9)"><svg class="ico20"><use href="#i-img"/></svg></div><div class="gal-overlay"><button class="h-btn h-btn-ghost" onclick="openEditGalItem(this)">Modifier</button><button class="h-btn" onclick="confirmDelete(\'cet élément galerie\')">Supprimer</button></div><div class="gal-label"><b></b><small></small></div><span class="gal-type">📷</span>';var oldIds=(state.deletedGalleryIds||[]).concat((state.gallery||[]).map(function(g){return Number(g.id)||0;}));var id=Math.max.apply(null,[12].concat(oldIds).concat(elements(document.getElementById('galGrid'),'.gal-item').map(function(x){return Number(x.getAttribute('data-sync-id'))||0;})))+1;renderGalleryAdmin(item,{id:id,title:title||(files[i]&&files[i].name)||'Nouvelle image',description:desc,category:category,image:image});document.getElementById('galGrid').appendChild(item);}window.closeModal('modalAddGal');saveContent(false);window.toast('Galerie publiée sur le site.','success');});}

  var addProgramSave=document.querySelector('#modalAddFiliere .modal-foot .h-btn-blue');if(addProgramSave){addProgramSave.removeAttribute('onclick');addProgramSave.addEventListener('click',function(){var fields=elements(document.querySelector('#modalAddFiliere .modal-body'),'input[type="text"],textarea');var code=text(fields[0]),title=text(fields[1]),description=text(fields[2]),tags=text(fields[3]).split(',').map(function(x){return x.trim();}).filter(Boolean);if(!title){window.toast('Indiquez le nom de la filière.','error');return;}var ids=(state.deletedProgramIds||[]).concat((state.programs||[]).map(function(p){return Number(p.id)||0;})).concat(elements(document.getElementById('filieresGrid'),'.filiere-card').map(function(card){return Number(card.getAttribute('data-sync-id'))||0;}));var id=Math.max.apply(null,[6].concat(ids))+1;document.getElementById('filieresGrid').appendChild(createProgramCard({id:id,code:code,title:title,description:description,tags:tags,enabled:true}));window.closeModal('modalAddFiliere');saveContent(false);window.toast('Filière publiée sur le site.','success');});}

  var addActorSave=document.querySelector('#modalAddActeur .modal-foot .h-btn-blue');if(addActorSave){addActorSave.removeAttribute('onclick');addActorSave.addEventListener('click',async function(){var modal=document.querySelector('#modalAddActeur'),fields=elements(modal,'input[type="text"]'),name=text(fields[0]),role=text(fields[1]),bio=text(modal.querySelector('textarea'));if(!name){window.toast('Indiquez le nom de la personne.','error');return;}var ids=(state.deletedActorIds||[]).concat((state.actors||[]).map(function(a){return Number(a.id)||0;})).concat(elements(document.getElementById('acteursList'),'.acteur-card').map(function(card){return Number(card.getAttribute('data-sync-id'))||0;}));var id=Math.max.apply(null,[4].concat(ids))+1;var image='',file=document.getElementById('acteurPhoto').files[0];if(file)try{image=await compressImage(file);}catch(_){}var actor={id:id,name:name,role:role,bio:bio,initials:text(fields[2]),image:image};document.getElementById('acteursList').appendChild(createActorCard(actor));window.closeModal('modalAddActeur');saveContent(false);window.toast('Profil publié sur le site.','success');});}
  var editingActor=null;
  document.addEventListener('click',function(e){var button=e.target.closest('#acteursList .act-btn.edit');if(!button)return;e.preventDefault();e.stopImmediatePropagation();editingActor=button.closest('.acteur-card');var f=elements(editingActor,'input[type="text"],textarea');var modal=document.getElementById('modalEditActeur'),inputs=elements(modal,'input[type="text"],textarea');if(inputs[0])inputs[0].value=f[1]?f[1].value:'';if(inputs[1])inputs[1].value=f[0]?f[0].value:'';if(inputs[2])inputs[2].value=f[2]?f[2].value:'';window.openModal('modalEditActeur');},true);
  var editActorSave=document.querySelector('#modalEditActeur .modal-foot .h-btn-blue');if(editActorSave){editActorSave.removeAttribute('onclick');editActorSave.addEventListener('click',function(){if(!editingActor)return;var inputs=elements(document.querySelector('#modalEditActeur'),'input[type="text"],textarea'),fields=elements(editingActor,'input[type="text"],textarea');if(fields[1]&&inputs[0])fields[1].value=inputs[0].value;if(fields[0]&&inputs[1])fields[0].value=inputs[1].value;if(fields[2]&&inputs[2])fields[2].value=inputs[2].value;var avatar=editingActor.querySelector('.acteur-av div');if(avatar)avatar.textContent=String(inputs[0]&&inputs[0].value||'?').split(/\s+/).map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();window.closeModal('modalEditActeur');saveContent(false);window.toast('Profil publié sur le site.','success');});}
  var addAdmissionButton=document.querySelector('#panel-contact #admissionSteps > .h-btn-ghost');if(addAdmissionButton){addAdmissionButton.removeAttribute('onclick');addAdmissionButton.addEventListener('click',function(){var list=document.querySelector('#panel-contact #admissionSteps > div'),index=elements(list,':scope > div').length;list.appendChild(createAdmissionStep(['','',''],index));window.toast('Étape ajoutée. Enregistrez la page pour la publier.','success');});}

  // Deleting a row/card is reflected in the public content before closing the confirmation dialog.
  window.confirmDelete=function(label){var ev=window.event,target=ev&&ev.target?ev.target.closest('.gal-item,.filiere-card,.acteur-card,.alumni-card,.tl-row,.admission-step,tr'):null;if(target)pendingDelete=target;var msg=document.getElementById('confirmMsg');if(msg)msg.textContent='Êtes-vous sûr de vouloir supprimer '+label+' ? Cette action est irréversible.';window.openModal('modalConfirm');};
  document.addEventListener('click',function(e){
    var del=e.target.closest('.act-btn.del,.gal-overlay .h-btn[onclick*="confirmDelete"]');if(del)pendingDelete=del.closest('.gal-item,.filiere-card,.acteur-card,.alumni-card,.tl-row,.admission-step,tr');
    if(e.target.closest('#modalConfirm .h-btn-danger')){e.preventDefault();e.stopImmediatePropagation();if(pendingDelete){var row=pendingDelete;var idx=Number(row.getAttribute('data-id'));if(row.matches('tr')&&Number.isInteger(idx)&&articleRecords[idx]){var removed=articleRecords.splice(idx,1)[0];overrides=overrides.filter(function(o){return o.id!==removed.id;});overrides.push(Object.assign({},removed,{published:false,deleted:true}));write(ARTICLE_KEY,overrides);renderArticleTable();}else row.remove();pendingDelete=null;saveContent(false);}window.closeModal('modalConfirm');window.toast('Contenu supprimé.','success');}
  },true);

  // Restore article overrides when returning to the admin editor and react to public-site edits in another tab.
  window.addEventListener('storage',function(e){if(e.key===CONTENT_KEY){state=read(CONTENT_KEY,{});applyContent(state);}if(e.key===ARTICLE_KEY){overrides=read(ARTICLE_KEY,[]);}});
  var queryPanel=new URLSearchParams(location.search).get('panel');if(queryPanel&&document.getElementById('panel-'+queryPanel))window.switchPanel(queryPanel);
})();
