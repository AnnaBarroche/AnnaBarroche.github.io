// =========================================================
// DONNÉES DU JEU
// =========================================================

let compteur        = 0;   // nombre d'étoiles actuelles
let parClic         = 1;   // étoiles gagnées par clic
let rangActuel      = 0;   // index du rang actuel
let victoireAffichee = false;

// Sceptre (autoclicker)
let sceptreActif    = false;
let sceptreInterval = null;
let sceptreNiveau   = 0;
let sceptreVitesse  = 1;

// Cristaux
let cristalActif    = false;
let cristalMulti    = 1;     // 1 = normal, 2 = bonus x2 actif
let cristalTimer    = null;

// Potion instable
let potionDanger    = false;
let clicsRecents    = 0;
let timerClicsRecents = null;

// =========================================================
// SONS
// =========================================================

const SONS = {
    fond:       new Audio('audio/musique-fond.mp3'),
    cristal:    new Audio('audio/cristal.mp3'),
    potion:     new Audio('audio/potion.mp3'),
    explosion:  new Audio('audio/explosion-potion-instable.mp3'),
    sceptre:    new Audio('audio/amélioration-du-sceptre.mp3'),
    rang:       new Audio('audio/changement-de-rang.mp3'),
    victoire:   new Audio('audio/victoire.mp3'),
};

// Musique de fond en boucle
SONS.fond.loop   = true;
SONS.fond.volume = 0.2;

// Volumes
SONS.cristal.volume   = 0.8;
SONS.potion.volume    = 0.8;
SONS.explosion.volume = 1.0;
SONS.sceptre.volume   = 0.9;
SONS.rang.volume      = 0.9;
SONS.victoire.volume  = 1.0;

// Démarre la musique de fond au premier geste utilisateur
// (nécessaire sur mobile/Chrome qui bloque l'autoplay)
let musiqueDemarree = false;
function demarrerMusique() {
    if (musiqueDemarree) return;
    musiqueDemarree = true;
    SONS.fond.play().catch(() => {});
}
document.addEventListener('click', demarrerMusique, { once: true });
document.addEventListener('touchstart', demarrerMusique, { once: true });

// Jouer un son court (repart depuis le début à chaque appel)
function jouerSon(son) {
    try {
        son.currentTime = 0;
        son.play().catch(() => {});
    } catch (e) {}
}

// Jouer un son en créant une nouvelle instance (pour les sons qui peuvent se superposer)
function jouerSonFresh(src, volume = 0.8) {
    try {
        const s = new Audio(src);
        s.volume = volume;
        s.play().catch(() => {});
    } catch (e) {}
}

// =========================================================
// FIOLES
// =========================================================

const FIOLES = [
    { id: 'fiole1', coutBase: 50,      bonus: 5,   couleur: '#00ff88', achats: 0 },
    { id: 'fiole2', coutBase: 1000,    bonus: 15,  couleur: '#4fc3f7', achats: 0 },
    { id: 'fiole3', coutBase: 50000,   bonus: 50,  couleur: '#ce93d8', achats: 0 },
    { id: 'fiole4', coutBase: 200000,  bonus: 150, couleur: '#ff7043', achats: 0 },
    { id: 'fiole5', coutBase: 1000000, bonus: 500, couleur: '#ffd54f', achats: 0 },
];

function coutFiole(fiole) {
    return Math.floor(fiole.coutBase * Math.pow(1.35, fiole.achats));
}

// =========================================================
// RANGS
// =========================================================

const RANGS = [
    { titre: 'Apprentie',       seuil: 0       },
    { titre: 'Novice',          seuil: 4000    },
    { titre: 'Herboriste',      seuil: 40000   },
    { titre: 'Sorcière',        seuil: 300000  },
    { titre: 'Archimage',       seuil: 1500000 },
    { titre: 'Grande Sorcière', seuil: 7500000 },
];

// =========================================================
// AMÉLIORATIONS DU SCEPTRE
// =========================================================

// La vitesse double à chaque niveau : 1 → 2 → 4 → 8 étoiles/s
const UPGRADES_SCEPTRE = [
    { cout: 2000,   label: 'Vitesse II — 2/s'  },
    { cout: 20000,  label: 'Vitesse III — 4/s' },
    { cout: 200000, label: 'Vitesse IV — 8/s'  },
];

// =========================================================
// MISE À JOUR DE L'AFFICHAGE
// =========================================================

function updateAffichage() {
    document.querySelector('#affichage').innerHTML =
        Math.floor(compteur) + ' <img src="image/etoile.webp" alt="étoile" id="etoile-compteur">';
    updateFioles();
    updateRang();
    updateSceptre();
    updateBarreProgression();
}

function updateFioles() {
    FIOLES.forEach(f => {
        const el   = document.querySelector('#' + f.id);
        const cout = coutFiole(f);
        el.querySelector('.info-fiole').textContent =
            cout.toLocaleString('fr-FR') + ' ⭐ — +' + f.bonus + '/clic';
        el.classList.toggle('disabled', compteur < cout);
    });
}

function updateRang() {
    let index = 0;
    for (let i = 0; i < RANGS.length; i++) {
        if (compteur >= RANGS[i].seuil) index = i;
    }

    if (index > rangActuel) {
        rangActuel = index;
        onNouveauRang(index);
    }

    document.querySelector('#nom-titre').textContent = RANGS[rangActuel].titre;

    const prochain = RANGS[rangActuel + 1];
    if (prochain) {
        document.querySelector('#progression-titre').textContent =
            'Prochain rang : ' + prochain.titre + ' à ' + prochain.seuil.toLocaleString('fr-FR');
    } else {
        document.querySelector('#progression-titre').textContent = '✦ Rang maximum atteint ✦';
        afficherVictoire();
    }
}

function updateSceptre() {
    const upgrade = UPGRADES_SCEPTRE[sceptreNiveau];
    const btn     = document.querySelector('#btn-upgrade-auto');
    const label   = document.querySelector('#cout-upgrade-auto');

    if (upgrade) {
        btn.disabled      = compteur < upgrade.cout;
        label.textContent = upgrade.label + ' — ' + upgrade.cout.toLocaleString('fr-FR') + ' ⭐';
    } else {
        btn.disabled      = true;
        label.textContent = 'Niveau max !';
    }

    document.querySelector('#label-sceptre').textContent =
        'Auto : ' + (sceptreActif ? 'ON (+' + sceptreVitesse + '/s)' : 'OFF');
}

// =========================================================
// CLIC SUR LE CHAUDRON
// =========================================================

document.querySelector('#chaudron').addEventListener('click', (event) => {

    if (potionDanger) {
        clicsRecents++;
        clearTimeout(timerClicsRecents);
        timerClicsRecents = setTimeout(() => { clicsRecents = 0; }, 2000);

        if (clicsRecents >= 8) {
            const perte = Math.floor(compteur * 0.05);
            compteur    = Math.max(0, compteur - perte);
            clicsRecents = 0;
            afficherToast('💥 Potion instable ! −' + perte.toLocaleString('fr-FR') + ' ⭐');
            jouerSon(SONS.explosion);
            effetFumee('#ff0000');
            updateAffichage();
            return;
        }
    }

    const gain = parClic * cristalMulti;
    compteur += gain;
    updateAffichage();
    spawnTexteGain(event, gain);
    creerEtoileFilante();
});

// =========================================================
// ACHETER UNE FIOLE
// =========================================================

FIOLES.forEach(f => {
    document.querySelector('#' + f.id).addEventListener('click', () => {
        const cout = coutFiole(f);
        if (compteur < cout) return;

        compteur -= cout;
        parClic  += f.bonus;
        f.achats++;

        effetFumee(f.couleur);
        jouerSonFresh('audio/achat-potion.mp3', 0.4);
        updateAffichage();
    });
});

// =========================================================
// SCEPTRE — ACTIVER / DÉSACTIVER
// =========================================================

document.querySelector('#btn-auto').addEventListener('click', () => {
    if (sceptreActif) {
        clearInterval(sceptreInterval);
        sceptreInterval = null;
        sceptreActif    = false;
        document.querySelector('#btn-auto').classList.remove('actif');
    } else {
        sceptreInterval = setInterval(() => {
            compteur += sceptreVitesse;
            updateAffichage();
        }, 1000);
        sceptreActif = true;
        document.querySelector('#btn-auto').classList.add('actif');
    }
    updateSceptre();
});

// =========================================================
// SCEPTRE — AMÉLIORER
// =========================================================

document.querySelector('#btn-upgrade-auto').addEventListener('click', () => {
    const upgrade = UPGRADES_SCEPTRE[sceptreNiveau];
    if (!upgrade || compteur < upgrade.cout) return;

    compteur -= upgrade.cout;
    sceptreVitesse = sceptreVitesse * 2; // double à chaque niveau : 1 → 2 → 4 → 8
    sceptreNiveau++;

    if (sceptreActif) {
        clearInterval(sceptreInterval);
        sceptreInterval = setInterval(() => {
            compteur += sceptreVitesse;
            updateAffichage();
        }, 1000);
    }

    jouerSon(SONS.sceptre);
    afficherToast('⚡ Sceptre amélioré ! +' + sceptreVitesse + ' étoiles/s');
    updateAffichage();
});

// =========================================================
// CRISTAUX FLOTTANTS
// =========================================================

const CRISTAUX = ['crystal_bleu', 'crystal_jaune', 'crystal_violet', 'crystal_rose', 'crystal_vert'];

function apparaitreCristal() {
    if (cristalActif) return;
    cristalActif = true;

    const nom = CRISTAUX[Math.floor(Math.random() * CRISTAUX.length)];

    const el  = document.createElement('div');
    el.className  = 'ingredient-flottant';
    el.style.left = (10 + Math.random() * 70) + 'vw';
    el.style.top  = (20 + Math.random() * 50) + 'vh';

    const img = document.createElement('img');
    img.src   = 'image/' + nom + '.png';
    img.alt   = nom;
    el.appendChild(img);
    document.body.appendChild(el);

    function retirerCristal(collecte) {
        if (!el.parentNode) return;
        el.remove();
        cristalActif = false;
        if (collecte) activerBonusCristal();
        planifierCristal();
    }

    el.addEventListener('click', () => retirerCristal(true));
    setTimeout(() => retirerCristal(false), 10000);
}

function activerBonusCristal() {
    clearTimeout(cristalTimer);

    jouerSon(SONS.cristal);

    const parClicAvant = parClic;
    cristalMulti       = 2;
    afficherToast('💎 Cristal collecté ! ×2 pendant 15s');

    cristalTimer = setTimeout(() => {
        const bonusAchetes = parClic - parClicAvant;
        parClic      = parClicAvant + bonusAchetes;
        cristalMulti = 1;
        afficherToast('💎 Bonus cristal terminé');
        updateAffichage();
    }, 15000);
}

function planifierCristal() {
    const delai = 20000 + Math.random() * 20000;
    setTimeout(apparaitreCristal, delai);
}

// =========================================================
// POTION INSTABLE
// =========================================================

function declencherPotion() {
    potionDanger = true;
    document.body.classList.add('potion-danger');
    jouerSon(SONS.potion);
    afficherToast('⚗️ Potion instable ! Évitez de cliquer trop vite pendant 10s…');
    effetFumee('#ff6600');

    setTimeout(() => {
        potionDanger = false;
        clicsRecents = 0;
        document.body.classList.remove('potion-danger');
        SONS.potion.pause();
        SONS.potion.currentTime = 0;
    }, 10000);
}

function planifierPotion() {
    const delai = 60000 + Math.random() * 30000;
    setTimeout(() => {
        declencherPotion();
        planifierPotion();
    }, delai);
}

// =========================================================
// CHANGEMENT DE RANG
// =========================================================

function onNouveauRang(index) {
    jouerSon(SONS.rang);
    if (index === 1) {
        document.querySelector('#zone-sceptre').style.display = 'flex';
        afficherToast('✦ Le sceptre magique est disponible ! ✦');
    }
    animerSorciere(RANGS[index].titre);
}

// =========================================================
// VICTOIRE
// =========================================================

function afficherVictoire() {
    if (victoireAffichee) return;
    victoireAffichee = true;
    jouerSon(SONS.victoire);
    document.querySelector('#popup-victoire').classList.add('visible');
}

document.querySelector('#popup-close').addEventListener('click', () => {
    document.querySelector('#popup-victoire').classList.remove('visible');
});

// =========================================================
// EFFETS VISUELS
// =========================================================

function spawnTexteGain(event, valeur) {
    const el = document.createElement('div');
    el.className = 'spawn-etoile';
    el.style.left = (event.clientX - 20) + 'px';
    el.style.top  = (event.clientY - 20) + 'px';

    const p = document.createElement('p');
    p.textContent = '+' + valeur;

    const img = document.createElement('img');
    img.src = 'image/etoile.webp';
    img.alt = '';

    el.appendChild(p);
    el.appendChild(img);
    document.body.appendChild(el);

    el.getBoundingClientRect();
    el.style.top     = (event.clientY - 100) + 'px';
    el.style.opacity = '0';

    setTimeout(() => el.remove(), 820);
}

function creerEtoileFilante() {
    const el = document.createElement('img');
    el.src   = 'image/etoile.webp';
    el.alt   = '';
    el.className  = 'etoile-filante';
    el.style.left = Math.random() * window.innerWidth + 'px';
    el.style.top  = '-30px';
    document.body.appendChild(el);

    el.getBoundingClientRect();
    el.style.top = (window.innerHeight + 30) + 'px';

    setTimeout(() => el.remove(), 2100);
}

function effetFumee(couleur) {
    const rect    = document.querySelector('#chaudron').getBoundingClientRect();
    const centreX = rect.left + rect.width / 2;
    const centreY = rect.top;

    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const p      = document.createElement('div');
            const taille = 20 + Math.random() * 25;
            p.style.cssText = `
                position: fixed;
                width: ${taille}px;
                height: ${taille}px;
                border-radius: 50%;
                background: ${couleur};
                box-shadow: 0 0 15px ${couleur};
                opacity: 0.9;
                pointer-events: none;
                z-index: 50;
                left: ${centreX + (Math.random() * 100 - 50)}px;
                top: ${centreY}px;
            `;
            document.body.appendChild(p);

            p.getBoundingClientRect();
            p.style.transition = 'top 1.2s ease-out, opacity 1.2s ease-out, transform 1.2s ease-out';
            p.style.top        = (centreY - 150 - Math.random() * 100) + 'px';
            p.style.opacity    = '0';
            p.style.transform  = `translateX(${Math.random() * 80 - 40}px) scale(1.5)`;

            setTimeout(() => p.remove(), 1300);
        }, i * 60);
    }
}

function afficherToast(texte) {
    const toast = document.createElement('div');
    toast.className = 'toast';

    const inner = document.createElement('div');
    inner.className   = 'toast-inner';
    inner.textContent = texte;
    toast.appendChild(inner);

    document.body.appendChild(toast);

    const titre     = document.querySelector('#contenu-titre').getBoundingClientRect();
    const affichage = document.querySelector('#affichage').getBoundingClientRect();
    const milieu    = (titre.bottom + affichage.top) / 2 - 60;

    toast.style.top       = milieu + 'px';
    toast.style.bottom    = 'auto';
    toast.style.transform = 'translateX(-50%) translateY(-50%)';

    setTimeout(() => {
        toast.style.transition = 'opacity 0.8s ease-out';
        toast.style.opacity    = '0';
        setTimeout(() => toast.remove(), 800);
    }, 3500);
}

function animerSorciere(titreRang) {
    const conteneur = document.createElement('div');
    conteneur.className = 'animation-rang-sorciere';

    const img = document.createElement('img');
    img.src   = 'image/sorciere.png';
    img.alt   = '';
    conteneur.appendChild(img);
    document.body.appendChild(conteneur);

    const texte = document.createElement('p');
    texte.className   = 'animation-rang-texte';
    texte.textContent = '✦ ' + titreRang + ' ✦';
    document.body.appendChild(texte);

    conteneur.getBoundingClientRect();
    conteneur.style.left = (window.innerWidth + 100) + 'px';

    setTimeout(() => { texte.style.opacity = '1'; }, 1200);

    setTimeout(() => {
        conteneur.style.opacity = '0';
        texte.style.opacity     = '0';
        setTimeout(() => {
            conteneur.remove();
            texte.remove();
        }, 800);
    }, 3500);
}

// =========================================================
// BARRE DE PROGRESSION
// =========================================================

function updateBarreProgression() {
    const seuilActuel = RANGS[rangActuel].seuil;
    const seuilSuivant = RANGS[rangActuel + 1] ? RANGS[rangActuel + 1].seuil : seuilActuel;

    let pct;
    if (!RANGS[rangActuel + 1]) {
        pct = 100;
    } else {
        pct = Math.min(100, Math.max(0,
            (compteur - seuilActuel) / (seuilSuivant - seuilActuel) * 100
        ));
    }

    document.querySelector('#barre-remplissage').style.width = pct + '%';
}

// Créer les mini-points qui flottent dans la barre
function initMiniPoints() {
    const conteneur = document.querySelector('#barre-points-mini');
    for (let i = 0; i < 6; i++) {
        const p = document.createElement('span');
        p.className = 'mini-point';
        p.style.left              = (5 + Math.random() * 85) + '%';
        p.style.top               = (15 + Math.random() * 60) + '%';
        p.style.animationDuration = (1.5 + Math.random() * 2.5) + 's';
        p.style.animationDelay    = (Math.random() * 3) + 's';
        conteneur.appendChild(p);
    }
}

initMiniPoints();

// =========================================================
// DÉMARRAGE
// =========================================================

setTimeout(planifierCristal, 30000);
setTimeout(planifierPotion,  90000);

updateAffichage();