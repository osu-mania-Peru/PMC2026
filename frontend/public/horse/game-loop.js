// Horse Page - Player Display
// Shows qualified tournament players in Umamusume-style prerace cards

class PlayerDisplay {
  constructor() {
    this.players = window.HORSE_DATA || [];
    this.setupPreraceScreen();
  }

  setupPreraceScreen() {
    const container = document.getElementById("preraceParticipants");
    if (!container) return;

    // Enable horizontal scrolling with mouse wheel
    container.addEventListener(
      "wheel",
      (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      },
      { passive: false },
    );

    // Click and drag scrolling
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener("mousedown", (e) => {
      isDown = true;
      container.style.cursor = "grabbing";
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener("mouseleave", () => {
      isDown = false;
      container.style.cursor = "grab";
    });

    container.addEventListener("mouseup", () => {
      isDown = false;
      container.style.cursor = "grab";
    });

    container.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2;
      container.scrollLeft = scrollLeft - walk;
    });

    container.style.cursor = "grab";

    // Setup music
    this.preraceMusic = new Audio("assets/entry-table.mp3");
    this.preraceMusic.loop = true;
    this.preraceMusic.volume = 0.7;

    // Wait for player data then show
    if (this.players.length > 0) {
      this.show();
    } else {
      const check = () => {
        this.players = window.HORSE_DATA || [];
        if (this.players.length > 0) {
          this.show();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    }
  }

  show() {
    this.populateCards();
    const loadingScreen = document.getElementById("loading");
    loadingScreen.style.opacity = "0";
    loadingScreen.style.pointerEvents = "none";
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
    }, 500);
    this.preraceMusic.play().catch((e) => console.log("Audio error:", e));
    this.animateCards();
    this.startBgSlideshow();
  }

  populateCards() {
    const container = document.getElementById("preraceParticipants");
    if (!container) return;

    const cardColors = [
      "#ffd700", "#ffeb3b", "#2196f3", "#4caf50",
      "#f44336", "#9c27b0", "#ff9800", "#795548",
      "#607d8b", "#e91e63", "#00bcd4", "#8bc34a",
    ];

    container.innerHTML = this.players
      .map((player, i) => {
        const cardColor = cardColors[i % cardColors.length];
        const name = player.name;
        const number = player.seed || (i + 1);
        const avatarContent = player.avatarUrl
          ? `<img src="${player.avatarUrl}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="fallback" style="display:none">${number}</div>`
          : `<div class="fallback">${number}</div>`;

        // TODO: favorite positions will be updated dynamically later
        const fav = this.getFavoritePosition(name);
        const styles = ["Late", "Pace", "Front", "End"];
        const style = styles[Math.floor(Math.random() * styles.length)];

        return `
          <div class="prerace-card">
            <div class="prerace-card-color" style="background-color: ${cardColor}"></div>
            <div class="prerace-card-content">
              <div class="prerace-card-number" style="background: ${cardColor}">${number}</div>
              <div class="prerace-card-name">${name}</div>
              <div class="prerace-card-info">
                <div class="prerace-card-info-symbols">
                  <div class="symbol-triangle"></div>
                  <div class="symbol-circle"></div>
                  <div class="symbol-triangle"></div>
                </div>
                <div class="prerace-card-info-fav">${fav}</div>
                <div class="prerace-card-info-style">${style}</div>
              </div>
              <div class="prerace-card-avatar">
                ${avatarContent}
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // TODO: this will be updated to pull from the API later
  getFavoritePosition(name) {
    if (name === 'josiaxarg') return '1er Fav';
    if (name === 'Itz_cuy') return '2do Fav';
    if (name === 'Renzo241004') return '3er Fav';
    if (name === 'Momichi') return '4to Fav';
    if (name === 'zinkotripas') return '5to Fav';
    if (name === '[Crz]RafaelPC') return '6to Fav';
    if (name === 'realninja234') return '7mo Fav';
    if (name === '- Croketa -') return '8vo Fav';
    if (name === 'cSamu') return '9no Fav';
    if (name === 'Ma_thias') return '10mo Fav';
    if (name === 'Sp3ctro') return '11vo Fav';
    if (name === 'Blu26') return '12vo Fav';
    if (name === 'Jxxx333') return '13vo Fav';
    if (name === 'SaturnoXD') return '14vo Fav';
    if (name === 'eduOvr4') return '15vo Fav';
    if (name === '[ Defuu- ]') return '16vo Fav';
    if (name === 'aduxce2') return '17vo Fav';
    if (name === 'leblack12123') return '18vo Fav';
    if (name === 'ERA Kaeseorin') return '19vo Fav';
    if (name === 'Fenixpro980') return '20vo Fav';
    if (name === 'Mati2312_OsuXD') return '21vo Fav';
    if (name === 'zikashi') return '22vo Fav';
    if (name === 'm4ton789') return '23vo Fav';
    if (name === 'sannkc') return '24vo Fav';
    if (name === 'GMbenjamin') return '25vo Fav';
    if (name === 'Ratainm45') return '26vo Fav';
    if (name === 'VircTux') return '27vo Fav';
    if (name === 'Javierlobo18') return '28vo Fav';
    if (name === 'Desinias') return '29vo Fav';
    if (name === 'kiloymedio') return '30mo Fav';
    if (name === 'Maloenlosjuegos') return '31vo Fav';
    if (name === 'mat 126') return '32vo Fav';
    if (name === 'picrack34') return '33vo Fav';
    return 'Fav';
  }

  startBgSlideshow() {
    const images = document.querySelectorAll("#preraceBgSlideshow img");
    if (images.length === 0) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 8;
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance;

    images.forEach((img) => {
      img.style.transition = "transform 60s linear, opacity 1.5s ease-in-out";
      img.style.transform = `translate(${targetX}%, ${targetY}%) scale(1.15)`;
    });

    let currentIndex = 0;
    setInterval(() => {
      images[currentIndex].classList.remove("active");
      currentIndex = (currentIndex + 1) % images.length;
      images[currentIndex].classList.add("active");
    }, 3000);
  }

  animateCards() {
    const container = document.getElementById("preraceParticipants");
    const cards = container.querySelectorAll(".prerace-card");

    if (cards.length === 0) return;

    container.scrollLeft = container.scrollWidth;

    setTimeout(() => {
      const reversedCards = Array.from(cards).reverse();
      const cardDelay = 80;

      for (let i = 0; i < Math.min(4, reversedCards.length); i++) {
        setTimeout(() => {
          reversedCards[i]?.classList.add("animate-in");
        }, i * cardDelay);
      }

      setTimeout(() => {
        const remainingCards = reversedCards.slice(4);
        const totalDuration = remainingCards.length * cardDelay;

        this.smoothScrollTo(container, 0, totalDuration, true);

        remainingCards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add("animate-in");
          }, index * cardDelay);
        });

        setTimeout(() => {
          const centerIndex = Math.floor(cards.length / 2);
          const centerCard = cards[centerIndex];
          if (centerCard) {
            const cardLeft = centerCard.offsetLeft;
            const cardWidth = centerCard.offsetWidth;
            const containerWidth = container.clientWidth;
            const centerScroll = cardLeft - containerWidth / 2 + cardWidth / 2;
            this.smoothScrollTo(container, centerScroll, 800, false, "easeInOutCubic");
          }
        }, totalDuration + 500);
      }, 4 * cardDelay);
    }, 600);
  }

  smoothScrollTo(element, target, duration, linear = false, easingName = "easeOutCubic") {
    const start = element.scrollLeft;
    const change = target - start;
    const startTime = performance.now();

    const easings = {
      linear: (t) => t,
      easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
      easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    };

    const ease = linear ? easings.linear : easings[easingName] || easings.easeOutCubic;

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      element.scrollLeft = start + change * ease(progress);
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }
}

// Start when script loads
new PlayerDisplay();
