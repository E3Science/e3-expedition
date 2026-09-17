/*
RESOURCE COLLECTION QUESTIONS
-----------------------------
Edit this array to change questions or add more. Each question needs a stable
id, a prompt, two or more answers, and the zero-based index of the right answer.
Incorrect answers automatically advance to the next question and wrap around.
*/
export const RESOURCE_QUIZ_QUESTIONS = [
  {
    id: "field-sample-first-step",
    prompt: "Which step should happen first when collecting a field sample?",
    answers: [
      "Record where the sample was found",
      "Put it in an unmarked container",
      "Mix it with another sample",
      "Discard the surrounding observations"
    ],
    correctAnswerIndex: 0
  },
  {
    id: "field-sample-label",
    prompt: "Why should a collected resource sample be labeled?",
    answers: [
      "To make every sample look identical",
      "So observations stay connected to the correct sample",
      "To increase the sample's mass",
      "So its collection site can be forgotten"
    ],
    correctAnswerIndex: 1
  },
  {
    id: "field-sample-observation",
    prompt: "Which observation is most useful when documenting a new sample?",
    answers: [
      "Only the time of day",
      "Only the collector's name",
      "Color, texture, and collection location",
      "A guess made without examining it"
    ],
    correctAnswerIndex: 2
  }
];

const QUALITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];
const SEGMENT_WIDTH = 172;
const WHEEL_HEIGHT = 180;
const WHEEL_PREVIEW_MS = 1000;

const RESOURCE_ART = {
  rock: {
    eyebrow: "GEOLOGY SAMPLE",
    title: "Analyze the mineral resource",
    imageSrc: "assets/tiles/isometric/individual/rock_formation_04.png",
    accent: "#b9c3cf",
    glow: "rgba(151, 172, 196, 0.42)",
    backdrop: "linear-gradient(135deg, rgba(27,34,44,.96), rgba(67,77,89,.86))"
  },
  pond: {
    eyebrow: "AQUATIC SAMPLE",
    title: "Analyze the water resource",
    imageSrc: "assets/tiles/isometric/individual/water_detail_02.png",
    accent: "#5ee9ff",
    glow: "rgba(61, 211, 255, 0.42)",
    backdrop: "linear-gradient(135deg, rgba(5,31,52,.96), rgba(9,91,120,.84))"
  },
  plant: {
    eyebrow: "BOTANY SAMPLE",
    title: "Analyze the plant resource",
    imageSrc: "assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-cyan-violet-v2/cyan_flora_01.png",
    tierImages: [
      "assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-cyan-violet-v2/cyan_flora_01.png",
      "assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-coral-indigo-v2/coral_flora_02.png",
      "assets/tiles/isometric/alien-expansion/collection-v2/individual/flora-cyan-violet-v2/violet_flora_04.png"
    ],
    accent: "#82f3ff",
    glow: "rgba(80, 207, 255, 0.44)",
    backdrop: "linear-gradient(135deg, rgba(9,35,50,.96), rgba(54,29,105,.86))"
  },
  animal: {
    eyebrow: "ZOOLOGY SPECIMEN",
    title: "Analyze the animal specimen",
    imageSrc: "assets/ui/inventory/herbivore_specimen.png",
    accent: "#ff9fe8",
    glow: "rgba(246, 92, 211, 0.42)",
    backdrop: "linear-gradient(135deg, rgba(46,15,54,.96), rgba(105,32,91,.86))"
  },
  specimen: {
    eyebrow: "ASTROBIOLOGY SPECIMEN",
    title: "Analyze the alien specimen",
    imageSrc: "assets/ui/inventory/herbivore_specimen.png",
    accent: "#d98cff",
    glow: "rgba(166, 82, 255, 0.46)",
    backdrop: "linear-gradient(135deg, rgba(25,12,58,.97), rgba(20,76,102,.88))"
  }
};

const FALLBACK_ART = RESOURCE_ART.rock;

function setStyles(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function makeElement(tagName, styles = {}, text = "") {
  const element = document.createElement(tagName);
  setStyles(element, styles);
  if (text) element.textContent = text;
  return element;
}

function getResourceArt(resourceKind, tier = 1) {
  const art = RESOURCE_ART[resourceKind] || FALLBACK_ART;
  if (!Array.isArray(art.tierImages)) return art;
  const normalizedTier = Math.max(1, Math.floor(Number(tier) || 1));
  const tierIndex = Math.max(0, Math.min(art.tierImages.length - 1, normalizedTier - 1));
  return { ...art, imageSrc: art.tierImages[tierIndex] || art.imageSrc };
}

function getQualityVisual(quality, qualityDefs) {
  const definition = qualityDefs?.[quality] || qualityDefs?.common || {};
  return {
    label: definition.label || quality,
    color: definition.borderColor || "#c8ced8",
    glow: definition.glowColor || "rgba(200,206,216,.28)"
  };
}

function shuffledCopy(entries) {
  const copy = [...entries];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function createResourceCollectionSequence({
  root,
  qualityDefs,
  getItemDefinition,
  onFloatingReward,
  onQuestionAttempt
}) {
  let phase = "idle";
  let context = null;
  let overlay = null;
  let questionCursor = 0;
  let pendingTimer = null;
  let finishTimer = null;
  let activeAnimations = [];
  let questionKeyboardHandler = null;

  function clearTimers() {
    if (pendingTimer) window.clearTimeout(pendingTimer);
    if (finishTimer) window.clearTimeout(finishTimer);
    activeAnimations.forEach((animation) => animation?.cancel?.());
    activeAnimations = [];
    pendingTimer = null;
    finishTimer = null;
  }

  function removeOverlay() {
    if (questionKeyboardHandler) {
      window.removeEventListener("keydown", questionKeyboardHandler);
      questionKeyboardHandler = null;
    }
    overlay?.remove();
    overlay = null;
  }

  function reset() {
    clearTimers();
    removeOverlay();
    phase = "idle";
    context = null;
  }

  function createOverlayShell(resourceContext, ariaLabel) {
    const art = getResourceArt(resourceContext?.resourceKind, resourceContext?.tier);
    const nextOverlay = makeElement("div", {
      position: "absolute",
      inset: "0",
      zIndex: "4000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      boxSizing: "border-box",
      pointerEvents: "auto",
      overflow: "hidden",
      userSelect: "none",
      caretColor: "transparent",
      background: "rgba(2, 7, 13, 0.78)",
      backdropFilter: "blur(7px)"
    });
    nextOverlay.setAttribute("role", "dialog");
    nextOverlay.setAttribute("aria-modal", "true");
    nextOverlay.setAttribute("aria-label", ariaLabel);

    const panel = makeElement("section", {
      position: "relative",
      width: "min(760px, 94vw)",
      minHeight: "430px",
      maxHeight: "90vh",
      overflow: "hidden auto",
      border: `1px solid ${art.accent}`,
      borderRadius: "18px",
      padding: "28px",
      boxSizing: "border-box",
      color: "#f5fbff",
      caretColor: "transparent",
      boxShadow: `0 24px 90px rgba(0,0,0,.62), 0 0 40px ${art.glow}`,
      backgroundImage: `${art.backdrop}, radial-gradient(circle at 82% 18%, ${art.glow}, transparent 35%), url(\"${art.imageSrc}\")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center, center, calc(100% - 32px) 28px",
      backgroundSize: "cover, cover, 190px 190px"
    });

    const content = makeElement("div", {
      position: "relative",
      zIndex: "2",
      caretColor: "transparent"
    });
    panel.appendChild(content);
    nextOverlay.appendChild(panel);
    root.appendChild(nextOverlay);
    overlay = nextOverlay;
    return { overlay: nextOverlay, panel, content, art };
  }

  function renderQuestion() {
    if (!context || !RESOURCE_QUIZ_QUESTIONS.length) return;
    clearTimers();
    removeOverlay();
    phase = "quiz";

    const questionIndex = questionCursor % RESOURCE_QUIZ_QUESTIONS.length;
    const question = RESOURCE_QUIZ_QUESTIONS[questionIndex];
    const { content, art } = createOverlayShell(context, "Resource collection question");

    content.appendChild(makeElement("div", {
      color: art.accent,
      fontSize: "12px",
      fontWeight: "800",
      letterSpacing: ".18em",
      marginBottom: "8px"
    }, art.eyebrow));

    content.appendChild(makeElement("h2", {
      margin: "0 0 8px",
      maxWidth: "500px",
      fontSize: "clamp(24px, 4vw, 34px)",
      lineHeight: "1.08"
    }, art.title));

    content.appendChild(makeElement("div", {
      color: "rgba(230,242,250,.72)",
      fontSize: "13px",
      marginBottom: "36px"
    }, `Question ${questionIndex + 1} of ${RESOURCE_QUIZ_QUESTIONS.length} • answer correctly to collect`));

    const questionCard = makeElement("div", {
      width: "min(520px, 100%)",
      padding: "20px",
      borderRadius: "14px",
      background: "rgba(5, 11, 18, .78)",
      border: "1px solid rgba(255,255,255,.13)",
      boxSizing: "border-box"
    });

    questionCard.appendChild(makeElement("div", {
      fontSize: "19px",
      fontWeight: "750",
      lineHeight: "1.35",
      marginBottom: "16px"
    }, question.prompt));

    const feedback = makeElement("div", {
      minHeight: "22px",
      marginTop: "12px",
      fontSize: "14px",
      fontWeight: "700"
    });

    const randomizedAnswers = shuffledCopy(
      question.answers.map((answer, originalIndex) => ({
        answer,
        correct: originalIndex === question.correctAnswerIndex
      }))
    );
    const answerButtons = [];
    let keyboardSelectionIndex = -1;

    randomizedAnswers.forEach(({ answer, correct }, answerIndex) => {
      const button = makeElement("button", {
        display: "block",
        width: "100%",
        margin: "8px 0",
        padding: "12px 14px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,.16)",
        color: "#f4f8fb",
        background: "rgba(22, 34, 47, .92)",
        font: "inherit",
        fontSize: "14px",
        textAlign: "left",
        cursor: "pointer",
        outline: "none"
      }, `${String.fromCharCode(65 + answerIndex)}. ${answer}`);

      button.addEventListener("mouseenter", () => {
        button.style.borderColor = art.accent;
        button.style.transform = "translateX(3px)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.borderColor = document.activeElement === button
          ? art.accent
          : "rgba(255,255,255,.16)";
        button.style.transform = "translateX(0)";
      });
      button.addEventListener("focus", () => {
        button.style.borderColor = art.accent;
      });
      button.addEventListener("blur", () => {
        button.style.borderColor = "rgba(255,255,255,.16)";
      });
      button.addEventListener("click", () => {
        onQuestionAttempt?.({
          resourceKind: context?.resourceKind,
          tier: context?.tier || 1,
          correct
        });
        const buttons = questionCard.querySelectorAll("button");
        buttons.forEach((entry) => { entry.disabled = true; });

        if (correct) {
          feedback.style.color = "#8dff9c";
          feedback.textContent = "Correct — analyzing your reward…";
          pendingTimer = window.setTimeout(() => {
            showWheelWaiting();
            const requestSent = context?.requestCollection?.();
            if (requestSent === false) {
              handleFailure("The collection request could not be sent.");
            }
          }, 420);
          return;
        }

        feedback.style.color = "#ff8c8c";
        feedback.textContent = "Not quite. Loading another question…";
        questionCursor = (questionIndex + 1) % RESOURCE_QUIZ_QUESTIONS.length;
        pendingTimer = window.setTimeout(renderQuestion, 850);
      });

      questionCard.appendChild(button);
      answerButtons.push(button);
    });

    questionKeyboardHandler = (event) => {
      if (phase !== "quiz" || !answerButtons.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        keyboardSelectionIndex = (keyboardSelectionIndex + 1) % answerButtons.length;
        answerButtons[keyboardSelectionIndex].focus({ preventScroll: true });
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        keyboardSelectionIndex = keyboardSelectionIndex < 0
          ? answerButtons.length - 1
          : (keyboardSelectionIndex - 1 + answerButtons.length) % answerButtons.length;
        answerButtons[keyboardSelectionIndex].focus({ preventScroll: true });
      } else if (event.key === "Enter" && keyboardSelectionIndex >= 0) {
        event.preventDefault();
        answerButtons[keyboardSelectionIndex].click();
      }
    };
    window.addEventListener("keydown", questionKeyboardHandler);

    questionCard.appendChild(feedback);
    content.appendChild(questionCard);

    // Keep every answer neutral until the pointer hovers it or keyboard
    // navigation explicitly chooses it. Browsers can otherwise preserve focus
    // from the control that opened the collection dialog.
    window.requestAnimationFrame(() => {
      if (overlay?.contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    const cancelButton = makeElement("button", {
      marginTop: "18px",
      padding: "8px 12px",
      border: "0",
      color: "rgba(235,244,250,.72)",
      background: "transparent",
      font: "inherit",
      cursor: "pointer",
      textDecoration: "underline"
    }, "Cancel collection");
    cancelButton.addEventListener("click", reset);
    content.appendChild(cancelButton);

  }

  function buildPointer() {
    const pointer = makeElement("div", {
      position: "absolute",
      left: "50%",
      top: "-2px",
      bottom: "-2px",
      zIndex: "5",
      width: "3px",
      transform: "translateX(-50%)",
      background: "#ffffff",
      boxShadow: "0 0 12px rgba(255,255,255,.9)",
      pointerEvents: "none"
    });
    const arrow = makeElement("div", {
      position: "absolute",
      left: "50%",
      top: "0",
      width: "0",
      height: "0",
      transform: "translate(-50%, -1px)",
      borderLeft: "9px solid transparent",
      borderRight: "9px solid transparent",
      borderTop: "13px solid #ffffff"
    });
    pointer.appendChild(arrow);
    return pointer;
  }

  function showWheelWaiting() {
    if (!context) return;
    clearTimers();
    removeOverlay();
    phase = "waiting";
    const { content, art } = createOverlayShell(context, "Resource reward analyzer");
    content.appendChild(makeElement("h2", {
      margin: "0 0 26px",
      fontSize: "clamp(26px, 4vw, 38px)"
    }, "Analyzing Resource"));

    const analyzer = makeElement("div", {
      position: "relative",
      width: "190px",
      height: "190px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "12px auto 0",
      borderRadius: "50%",
      border: `1px solid ${art.accent}`,
      background: `radial-gradient(circle, ${art.glow}, rgba(4,9,15,.96) 70%)`,
      boxShadow: `0 0 34px ${art.glow}, inset 0 0 28px ${art.glow}`
    });
    const resourceImage = document.createElement("img");
    resourceImage.src = art.imageSrc;
    resourceImage.alt = "Resource being analyzed";
    setStyles(resourceImage, {
      width: "142px",
      height: "142px",
      objectFit: "contain",
      imageRendering: "pixelated",
      filter: `drop-shadow(0 0 14px ${art.accent})`
    });
    analyzer.appendChild(resourceImage);
    content.appendChild(analyzer);

    const analyzerAnimation = analyzer.animate(
      [
        { transform: "scale(.96)", opacity: 0.78 },
        { transform: "scale(1.04)", opacity: 1 },
        { transform: "scale(.96)", opacity: 0.78 }
      ],
      {
        duration: 1200,
        iterations: Infinity,
        easing: "ease-in-out"
      }
    );
    activeAnimations.push(analyzerAnimation);
  }

  function createWheelSegment(quality, itemDefinition, target = false) {
    const visual = getQualityVisual(quality, qualityDefs);
    const segment = makeElement("div", {
      flex: `0 0 ${SEGMENT_WIDTH}px`,
      height: `${WHEEL_HEIGHT}px`,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "5px",
      borderRight: "1px solid rgba(255,255,255,.14)",
      borderTop: `5px solid ${visual.color}`,
      color: "#f7fbff",
      background: `linear-gradient(180deg, ${visual.glow}, rgba(7,12,19,.96))`,
      boxShadow: target ? `inset 0 0 28px ${visual.glow}` : "none"
    });

    if (itemDefinition?.imageSrc) {
      const icon = document.createElement("img");
      icon.src = itemDefinition.imageSrc;
      icon.alt = "";
      setStyles(icon, {
        width: "76px",
        height: "76px",
        objectFit: "contain",
        imageRendering: "pixelated",
        filter: `drop-shadow(0 0 7px ${visual.color})`
      });
      segment.appendChild(icon);
    }

    segment.appendChild(makeElement("div", {
      color: visual.color,
      fontSize: "14px",
      fontWeight: "850",
      textTransform: "uppercase",
      letterSpacing: ".05em"
    }, visual.label));
    segment.appendChild(makeElement("div", {
      maxWidth: "130px",
      overflow: "hidden",
      color: "rgba(240,247,252,.82)",
      fontSize: "10px",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }, context?.resourceLabel || itemDefinition?.label || "Resource"));
    return segment;
  }

  async function animateWheelPhase(track, fromX, toX, durationMs, easing) {
    if (!track?.isConnected || phase !== "spinning") return false;

    const animation = track.animate(
      [
        { transform: `translateX(${fromX}px)` },
        { transform: `translateX(${toX}px)` }
      ],
      {
        duration: Math.max(1, durationMs),
        easing,
        fill: "forwards"
      }
    );
    activeAnimations.push(animation);

    try {
      await animation.finished;
      if (phase !== "spinning" || !track.isConnected) return false;
      track.style.transform = `translateX(${toX}px)`;
      animation.cancel();
      activeAnimations = activeAnimations.filter((entry) => entry !== animation);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function launchConfetti(container, visual) {
    const palette = QUALITY_ORDER.map(
      (quality) => getQualityVisual(quality, qualityDefs).color
    );
    palette.push(visual.color, "#ffffff", "#66e8ff");

    for (let index = 0; index < 52; index++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 250;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance * 0.72 + 45;
      const confetti = makeElement("i", {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${5 + Math.random() * 7}px`,
        height: `${8 + Math.random() * 12}px`,
        borderRadius: Math.random() > 0.65 ? "50%" : "2px",
        background: palette[index % palette.length],
        boxShadow: `0 0 7px ${palette[index % palette.length]}`,
        pointerEvents: "none"
      });
      container.appendChild(confetti);

      const animation = confetti.animate(
        [
          {
            transform: "translate(-50%, -50%) rotate(0deg) scale(.2)",
            opacity: 1
          },
          {
            transform: `translate(calc(-50% + ${endX * 0.72}px), calc(-50% + ${endY * 0.45}px)) rotate(${180 + Math.random() * 260}deg) scale(1)`,
            opacity: 1,
            offset: 0.55
          },
          {
            transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) rotate(${420 + Math.random() * 420}deg) scale(.72)`,
            opacity: 0
          }
        ],
        {
          duration: 1050 + Math.random() * 650,
          delay: Math.random() * 140,
          easing: "cubic-bezier(.12,.62,.25,1)",
          fill: "forwards"
        }
      );
      activeAnimations.push(animation);
      animation.finished.then(
        () => confetti.remove(),
        () => confetti.remove()
      );
    }
  }

  function showPrizeCelebration({ content, itemDefinition, payload, quality }) {
    if (!content?.isConnected) return;
    phase = "reveal";
    const visual = getQualityVisual(quality, qualityDefs);
    const panel = content.closest("section");
    if (panel) {
      panel.style.overflow = "hidden";
      panel.scrollTop = 0;
    }
    window.getSelection?.()?.removeAllRanges();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    content.innerHTML = "";
    setStyles(content, {
      position: "relative",
      minHeight: "360px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      caretColor: "transparent"
    });

    const confettiLayer = makeElement("div", {
      position: "absolute",
      inset: "0",
      zIndex: "1",
      overflow: "hidden",
      pointerEvents: "none"
    });
    content.appendChild(confettiLayer);

    content.appendChild(makeElement("h2", {
      position: "relative",
      zIndex: "2",
      color: visual.color,
      fontSize: "clamp(26px, 5vw, 40px)",
      fontWeight: "900",
      lineHeight: "1.08",
      margin: "0 0 18px"
    }, itemDefinition.label || payload.itemLabel || "Resource Collected"));

    const prizeCard = makeElement("div", {
      position: "relative",
      zIndex: "2",
      width: "min(290px, 74vw)",
      minHeight: "230px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      padding: "22px",
      boxSizing: "border-box",
      borderRadius: "24px",
      border: `3px solid ${visual.color}`,
      color: "#ffffff",
      background: `radial-gradient(circle, ${visual.glow}, rgba(5,10,17,.98) 68%)`,
      boxShadow: `0 0 55px ${visual.glow}, inset 0 0 35px ${visual.glow}`
    });

    if (itemDefinition?.imageSrc) {
      const prizeImage = document.createElement("img");
      prizeImage.src = itemDefinition.imageSrc;
      prizeImage.alt = itemDefinition.label || payload.itemLabel || "Collected resource";
      setStyles(prizeImage, {
      width: "168px",
      height: "168px",
        objectFit: "contain",
        imageRendering: "pixelated",
        filter: `drop-shadow(0 0 18px ${visual.color})`
      });
      prizeCard.appendChild(prizeImage);
    }

    content.appendChild(prizeCard);

    const cardAnimation = prizeCard.animate(
      [
        { transform: "scale(.18) rotate(-7deg)", opacity: 0 },
        { transform: "scale(1.18) rotate(2deg)", opacity: 1, offset: 0.68 },
        { transform: "scale(1) rotate(0deg)", opacity: 1 }
      ],
      {
        duration: 720,
        easing: "cubic-bezier(.18,.78,.22,1)",
        fill: "forwards"
      }
    );
    activeAnimations.push(cardAnimation);
    launchConfetti(confettiLayer, visual);
    onFloatingReward?.(payload.itemKey);

    const continueButton = makeElement("button", {
      position: "relative",
      zIndex: "2",
      marginTop: "20px",
      padding: "10px 20px",
      borderRadius: "999px",
      border: `1px solid ${visual.color}`,
      color: "#ffffff",
      background: "rgba(8,15,23,.86)",
      font: "inherit",
      fontWeight: "750",
      cursor: "pointer",
      userSelect: "none",
      caretColor: "transparent"
    }, "Continue");
    continueButton.tabIndex = -1;
    continueButton.addEventListener("mousedown", (event) => event.preventDefault());
    continueButton.addEventListener("click", reset);
    content.appendChild(continueButton);
    finishTimer = window.setTimeout(reset, 3600);
  }

  function receiveReward(payload) {
    if (!payload?.itemKey) return false;
    if (!context) {
      context = {
        resourceKind: payload.resourceKind || "rock",
        resourceLabel: "Resource"
      };
    }

    clearTimers();
    removeOverlay();
    phase = "spinning";

    const itemDefinition = getItemDefinition?.(payload.itemKey) || {};
    const quality = String(payload.quality || payload.itemKey.split(":")[1] || "common");
    const durationMs = Math.max(500, Number(payload.cooldownMs) || 2000);
    const { content } = createOverlayShell(context, "Resource rarity prize wheel");

    content.appendChild(makeElement("h2", {
      margin: "0 0 26px",
      fontSize: "clamp(26px, 4vw, 38px)"
    }, "Resource Prize Wheel"));

    const viewport = makeElement("div", {
      position: "relative",
      width: "100%",
      height: `${WHEEL_HEIGHT}px`,
      overflow: "hidden",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,.2)",
      background: "rgba(4,9,15,.92)",
      boxShadow: "inset 0 0 24px rgba(0,0,0,.7)"
    });
    const track = makeElement("div", {
      display: "flex",
      height: `${WHEEL_HEIGHT}px`,
      willChange: "transform",
      transform: "translateX(0px)"
    });

    const segmentQualities = [];
    for (let index = 0; index < 45; index++) {
      segmentQualities.push(QUALITY_ORDER[index % QUALITY_ORDER.length]);
    }
    const targetIndex = 39;
    segmentQualities[targetIndex] = quality;
    segmentQualities.forEach((entryQuality, index) => {
      track.appendChild(createWheelSegment(
        entryQuality,
        itemDefinition,
        index === targetIndex
      ));
    });

    viewport.appendChild(track);
    viewport.appendChild(buildPointer());
    content.appendChild(viewport);

    const viewportWidth = viewport.clientWidth || 650;
    const targetCenter = targetIndex * SEGMENT_WIDTH + SEGMENT_WIDTH / 2;
    const destination = viewportWidth / 2 - targetCenter;
    const startPosition = destination + SEGMENT_WIDTH * 30;
    const totalTravel = destination - startPosition;
    track.style.transform = `translateX(${startPosition}px)`;

    pendingTimer = window.setTimeout(async () => {
      pendingTimer = null;
      if (phase !== "spinning" || !track.isConnected) return;

      const slowEnd = startPosition + totalTravel * 0.12;
      const fastEnd = startPosition + totalTravel * 0.78;
      const slowDuration = durationMs * 0.28;
      const fastDuration = durationMs * 0.44;
      const finalDuration = Math.max(1, durationMs - slowDuration - fastDuration);

      const completedSlowPhase = await animateWheelPhase(
        track,
        startPosition,
        slowEnd,
        slowDuration,
        "cubic-bezier(.42,0,.76,1)"
      );
      if (!completedSlowPhase) return;

      const completedFastPhase = await animateWheelPhase(
        track,
        slowEnd,
        fastEnd,
        fastDuration,
        "linear"
      );
      if (!completedFastPhase) return;

      const completedFinalPhase = await animateWheelPhase(
        track,
        fastEnd,
        destination,
        finalDuration,
        "cubic-bezier(.08,.72,.16,1)"
      );
      if (!completedFinalPhase) return;

      pendingTimer = window.setTimeout(() => {
        pendingTimer = null;
        showPrizeCelebration({
          content,
          itemDefinition,
          payload,
          quality
        });
      }, 420);
    }, WHEEL_PREVIEW_MS);

    return true;
  }

  function handleFailure(message) {
    if (phase !== "waiting") return false;
    clearTimers();
    if (overlay) {
      const panel = overlay.querySelector("section");
      const error = makeElement("div", {
        position: "relative",
        zIndex: "3",
        marginTop: "22px",
        padding: "12px",
        borderRadius: "9px",
        color: "#ff9b9b",
        background: "rgba(80,10,10,.72)",
        fontWeight: "700"
      }, message || "The resource could not be collected.");
      panel?.appendChild(error);
    }
    finishTimer = window.setTimeout(reset, 1800);
    return true;
  }

  function start(nextContext) {
    if (!nextContext?.requestCollection || phase !== "idle") return false;
    context = nextContext;
    questionCursor = Math.floor(Math.random() * Math.max(1, RESOURCE_QUIZ_QUESTIONS.length));
    renderQuestion();
    return true;
  }

  function destroy() {
    reset();
  }

  return {
    start,
    receiveReward,
    handleFailure,
    cancel: reset,
    destroy,
    isActive: () => phase !== "idle",
    getPhase: () => phase
  };
}
