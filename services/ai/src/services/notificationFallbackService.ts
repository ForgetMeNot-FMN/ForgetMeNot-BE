import {
  NotificationDecisionResult,
  NotificationReasonData,
  NotificationSourceType,
} from "../models/decisionModel";
import { UserContextDTO } from "../models/userContextModel";

interface GenerateFallbackMessageOptions {
  sourceType?: NotificationSourceType;
}

interface NotificationCopy {
  title: string;
  body: string;
}

interface FallbackMessageResult extends NotificationCopy {
  message: string;
  strategy: {
    branch: string;
    variantIndex: number;
    sourceType: NotificationSourceType;
    personaTone: string;
    intensity: string;
  };
}

interface FallbackState {
  context: UserContextDTO;
  decision: NotificationDecisionResult;
  reason: NotificationReasonData;
  sourceType: NotificationSourceType;
  personaTone: "soft" | "friendly" | "strict" | "balanced";
  ageGroup: "teen" | "young_adult" | "adult" | "mature" | "unknown";
  genderProfile: "female" | "male" | "nonbinary" | "other" | "unknown";
  sourceLabel: string;
  username: string | null;
  goal: string | null;
  painPoint: string | null;
  disciplineLevel: number | null;
  preferredTime: string | null;
  dailyCommitment: number | null;
  hasHighIgnoreRate: boolean;
  hasCompletionSignal: boolean;
  hasPlannedToday: boolean;
  hasTaskBacklog: boolean;
  hasHabitBacklog: boolean;
  totalDoneToday: number;
  language: "en" | "tr";
  demographicLeaf:
    | "young_female"
    | "young_male"
    | "young_other"
    | "adult_female"
    | "adult_male"
    | "adult_other"
    | "mature_female"
    | "mature_male"
    | "mature_other"
    | "young_unknown_gender"
    | "adult_unknown_gender"
    | "mature_unknown_gender"
    | "unknown_age_female"
    | "unknown_age_male"
    | "unknown_age_other"
    | "generic_unknown_demo";
}

class NotificationFallbackService {
  generateMessage(
    context: UserContextDTO,
    decision: NotificationDecisionResult,
    options?: GenerateFallbackMessageOptions,
  ): FallbackMessageResult {
    const reason = this.parseReason(decision.reason);
    const sourceType = options?.sourceType ?? "SYSTEM";
    const state = this.buildState(context, decision, reason, sourceType);
    const title = this.buildTitle(state);
    const bodies = this.buildBodies(state);
    const variantIndex = Math.floor(Math.random() * bodies.length);
    const body = this.trimForNotification(bodies[variantIndex], 118);

    return {
      title: this.trimForNotification(title, 42),
      body,
      message: body,
      strategy: {
        branch: [
          decision.type,
          reason.trigger,
          reason.intensity,
          state.personaTone,
          state.demographicLeaf,
          sourceType,
        ].join(":"),
        variantIndex,
        sourceType,
        personaTone: state.personaTone,
        intensity: reason.intensity,
      },
    };
  }

  private buildTitle(state: FallbackState): string {
    if (state.language === "tr") {
      switch (state.reason.trigger) {
        case "streak_break":
          return state.reason.intensity === "HIGH"
            ? "Seriniz durdu"
            : "Bugün küçük bir ara";
        case "severe_drop":
          return state.reason.intensity === "HIGH"
            ? "Temponu sıfırlayalım"
            : "Sıfırlama zamanı";
        case "no_activity_today":
          return "Bugün hâlâ açık";
        case "low_engagement":
          return "Rutinine yakın kal";
        case "high_streak":
          return state.reason.streak >= 14
            ? `${state.reason.streak} günlük seri`
            : "Seriniz harika görünüyor";
        case "high_performance":
          return "Güzel bir gidişatın var";
        case "strong_daily_progress":
          return "Bugün sağlam ilerleme";
        case "daily_progress":
          return "Bugün güzel gidiyor";
        case "steady_state":
        default:
          if (state.decision.type === "WARNING") return "Küçük bir sıfırlama";
          if (state.decision.type === "CELEBRATION") return "Devam ettir bunu";
          return "Temponu sabit tut";
      }
    }

    switch (state.reason.trigger) {
      case "streak_break":
        return state.reason.intensity === "HIGH"
          ? "Your streak paused"
          : "Small reset today";
      case "severe_drop":
        return state.reason.intensity === "HIGH"
          ? "Let's reset your pace"
          : "Time for a reset";
      case "no_activity_today":
        return "Today's still open";
      case "low_engagement":
        return "Stay close to the routine";
      case "high_streak":
        return state.reason.streak >= 14
          ? `${state.reason.streak}-day streak`
          : "Your streak looks good";
      case "high_performance":
        return "You're on a good run";
      case "strong_daily_progress":
        return "Solid progress today";
      case "daily_progress":
        return "Nice work today";
      case "steady_state":
      default:
        if (state.decision.type === "WARNING") {
          return "Small reset, not a big one";
        }

        if (state.decision.type === "CELEBRATION") {
          return "Keep this going";
        }

        return "Keep your pace steady";
    }
  }

  private buildBodies(state: FallbackState): string[] {
    switch (state.reason.trigger) {
      case "streak_break":
        return this.buildStreakBreakBodies(state);
      case "severe_drop":
        return this.buildSevereDropBodies(state);
      case "no_activity_today":
        return this.buildNoActivityTodayBodies(state);
      case "low_engagement":
        return this.buildLowEngagementBodies(state);
      case "high_streak":
        return this.buildHighStreakBodies(state);
      case "high_performance":
        return this.buildHighPerformanceBodies(state);
      case "strong_daily_progress":
        return this.buildStrongDailyProgressBodies(state);
      case "daily_progress":
        return this.buildDailyProgressBodies(state);
      case "steady_state":
      default:
        return this.buildSteadyStateBodies(state);
    }
  }

  private buildStreakBreakBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "WARNING" && state.reason.intensity === "HIGH") {
        if (state.personaTone === "soft" || state.hasHighIgnoreRate) {
          return this.pickThree([
            `${this.nameIntro(state, true)}bugün seri kırıldı. Yeniden başlamak için bir ${state.sourceLabel} yeterli.`,
            "Seri önemliydi. Bu akşam küçük bir adımla yenisine başla.",
            "Dramatik bir sıfırlamaya gerek yok, bugün sadece bir adım at.",
          ]);
        }

        if (state.personaTone === "strict" || state.disciplineLevel === 5) {
          return this.pickThree([
            `${this.nameIntro(state, true)}bugün seri gitti. Temiz bir ${state.sourceLabel} kazanımıyla yeniden başla.`,
            `Sıfırlama oldu. Gün bitmeden bir ${state.sourceLabel} tamamla.`,
            `Bir günün ikiye dönmesine izin verme. Şimdi bir ${state.sourceLabel} bitir.`,
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            `${this.nameIntro(state, true)}seri kaçtı ama bugün hâlâ kurtarılabilir. Bir adımla yeniden başlarsın.`,
            `O seri güzeldi. Hızlı bir ${state.sourceLabel} ile yenisine başla.`,
            "Mükemmel bir geri dönüşe gerek yok. Sadece bir adım yeterli.",
          ]);
        }
      }

      if (state.decision.type === "WARNING") {
        if (state.personaTone === "soft") {
          return this.pickThree([
            `Seri bugün durdu. Kolay bir ${state.sourceLabel} ile yeniden harekete geç.`,
            "Bugün hafiften başlamak yeterli. Sadece bir adım at.",
            `Ağır alma. Bir ${state.sourceLabel} bugün için yeterli.`,
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            `Seri bitti. Tamamlanmış bir ${state.sourceLabel} ile düzelt.`,
            "Bugün temiz bir kazanımla kurtar.",
            "Odaklı bir adımla ritme geri dön.",
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            `${this.nameIntro(state, true)}seri bugün durdu. Bir adımla yeniden içine girersin.`,
            `O seri güzeldi. Gün kapanmadan yenisine başla.`,
            `Bugünü hızlı bir ${state.sourceLabel} ile kurtarabilirsin.`,
          ]);
        }
      }

      return this.pickThree([
        `${this.nameIntro(state, true)}seriniz bugün durdu. Odaklı bir ${state.sourceLabel} sıfırlamayı başlatır.`,
        `${this.goalLead(state)}Kırık bir seri, bugün harekete geçersen daha kolay düzelir.`,
        `Seri bitti ama rutin bitmek zorunda değil. Bir ${state.sourceLabel} yap.`,
      ]);
    }

    if (state.decision.type === "WARNING" && state.reason.intensity === "HIGH") {
      if (state.personaTone === "soft" || state.hasHighIgnoreRate) {
        return this.pickThreeLeaf(state, [
          `${this.nameIntro(state, true)}the streak broke today. One small ${state.sourceLabel} is enough to restart.`,
          `Today interrupted the streak. Keep the reset gentle and do one ${state.sourceLabel}.`,
          `No big comeback needed today. One step is enough.`,
        ], "streak_break:warning_high_soft");
      }

      if (state.personaTone === "strict" || state.disciplineLevel === 5) {
        return this.pickThreeLeaf(state, [
          `${this.nameIntro(state, true)}the streak is gone for today. Rebuild it with one clean ${state.sourceLabel} win.`,
          `Reset happened. Close one ${state.sourceLabel} before the day ends.`,
          `Do not let one break become two. Get one ${state.sourceLabel} done now.`,
        ], "streak_break:warning_high_strict");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `${this.nameIntro(state, true)}the streak slipped, but today is still recoverable. One step gets you going again.`,
          `That streak was good. Start the next one with one quick ${state.sourceLabel}.`,
          `You do not need a perfect comeback. Just one ${state.sourceLabel} is enough.`,
        ], "streak_break:warning_high_friendly");
      }
    }

    if (state.decision.type === "WARNING") {
      if (state.personaTone === "soft") {
        return this.pickThreeLeaf(state, [
          `The streak paused today. One easy ${state.sourceLabel} gets you moving again.`,
          `A small restart is enough today. Just take one step.`,
          `Keep the comeback light. One ${state.sourceLabel} is plenty.`,
        ], "streak_break:warning_soft");
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `The streak slipped. Fix it with one completed ${state.sourceLabel}.`,
          `Recover today with one clean win.`,
          `Get back on standard with one focused step.`,
        ], "streak_break:warning_strict");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `${this.nameIntro(state, true)}the streak paused today. One step gets you back in it.`,
          `That streak was good. Start the next one before the day closes.`,
          `You can turn today around with one quick ${state.sourceLabel}.`,
        ]);
      }
    }

    return this.pickThreeLeaf(state, [
      `${this.nameIntro(state, true)}your streak paused today. One focused ${state.sourceLabel} gets the reset started.`,
      `${this.goalLead(state)}A broken streak is easier to recover when you act today.`,
      `The streak ended, but the routine does not have to. Do one ${state.sourceLabel}.`,
    ]);
  }

  private buildSevereDropBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "WARNING" && state.reason.intensity === "HIGH") {
        if (state.personaTone === "soft" || state.hasHighIgnoreRate) {
          return this.pickThree([
            "Bu hafta normalden daha ağır hissettiriyor. Bugün bir adım yeterli.",
            `${this.goalLead(state)}Büyük bir plan gerekmez, bugün bir adım yeterli.`,
            `Sonraya bırakma, küçük başla. Bugün bir ${state.sourceLabel} yeterli.`,
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            `Tempo düştü. Bir ${state.sourceLabel} tamamlayarak burada durdur.`,
            "Şimdi toparlanma zamanı. Bugün bir şeyi bitir.",
            `${this.commitmentLead(state)}Bugünü temiz bir kazanımla değerlendir.`,
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            `${this.capitalize(state.painPoint ?? "bu zorlu dönem")} bugünü de götürmek zorunda değil.`,
            "Düşük bir dönem geçirdin. Bugünü hafif tut ve bir adım at.",
            `${this.nameIntro(state, false)}bir ${state.sourceLabel} düşüşü kesmek için yeterli.`,
          ]);
        }
      }

      if (state.decision.type === "WARNING") {
        if (state.personaTone === "soft") {
          return this.pickThree([
            "Her zamanki temponda değilsin. Küçük bir sıfırlama yardımcı olur.",
            `Bugünü hafif tut ve bir ${state.sourceLabel} yap.`,
            "Bugün için küçük bir adım yeterli.",
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            `Biraz kayıyorsun. Bir ${state.sourceLabel} seç ve tamamla.`,
            "Küçük bir adım işlerin daha da kötüleşmesini engeller.",
            "Net bir adım at ve rutine geri dön.",
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            "Tempun her zamankinden daha sakin. Bugün bir adım yardımcı olur.",
            "Bugün hafif bir sıfırlama çok şey yapar.",
            `Kolay bir ${state.sourceLabel} seç ve ilerliyor say.`,
          ]);
        }
      }

      return this.pickThree([
        `Rutin biraz bozuldu. Kolay bir adımla başla.`,
        `${this.goalLead(state)}Motivasyon bekleme, bugün bir adım at.`,
        "Momentum şu an düşük. Daha da kaymasın diye harekete geç.",
      ]);
    }

    if (state.decision.type === "WARNING" && state.reason.intensity === "HIGH") {
      if (state.personaTone === "soft" || state.hasHighIgnoreRate) {
        return this.pickThreeLeaf(state, [
          `This week feels heavier than usual. One step today is enough.`,
          `${this.goalLead(state)}You do not need a full recovery plan, just one useful action.`,
          `Start smaller, not later. One ${state.sourceLabel} is enough for today.`,
        ], "severe_drop:warning_high_soft");
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `Your pace dropped. Stop it here with one completed ${state.sourceLabel}.`,
          `This is the moment to reset your standard. Finish one thing today.`,
          `${this.commitmentLead(state)}Make today count with one clear win.`,
        ], "severe_drop:warning_high_strict");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `${this.capitalize(state.painPoint ?? "this rough stretch")} does not need to run today too.`,
          `You've had a low patch. Keep today lighter and just take one useful step.`,
          `${this.nameIntro(state, false)}one ${state.sourceLabel} is enough to interrupt the slide.`,
        ], "severe_drop:warning_high_friendly");
      }
    }

    if (state.decision.type === "WARNING") {
      if (state.personaTone === "soft") {
        return this.pickThreeLeaf(state, [
          `You are off your usual pace. A small reset would help.`,
          `Keep today lighter and do one ${state.sourceLabel}.`,
          `One useful step is enough for today.`,
        ], "severe_drop:warning_soft");
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `You are slipping a bit. Choose one ${state.sourceLabel} and close it.`,
          `One useful action stops this from growing.`,
          `Take one clear step and tighten the routine.`,
        ], "severe_drop:warning_strict");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `Your pace is softer than usual. One step today helps.`,
          `A light reset today would do a lot.`,
          `Take one manageable ${state.sourceLabel} and call that progress.`,
        ], "severe_drop:warning_friendly");
      }
    }

    return this.pickThreeLeaf(state, [
      `Your routine needs a reset. Start with one manageable ${state.sourceLabel}.`,
      `${this.goalLead(state)}One step today helps more than waiting for motivation.`,
      `Momentum is low right now. Take one action before it drifts further.`,
    ], "severe_drop:warning_balanced");
  }

  private buildNoActivityTodayBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "WARNING") {
        if (state.personaTone === "soft") {
          return this.pickThree([
            `Bugün henüz ilerleme yok. Kolay bir ${state.sourceLabel} ile başla.`,
            `${this.timeLead(state)}Küçücük bir adım bile sayılır.`,
            "Bugün hâlâ açık. İlk adımı küçük tut.",
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            state.hasTaskBacklog
              ? "Bugün hâlâ hiçbir şey bitmedi. Şimdi bir görevi tamamla."
              : `Bugün henüz ilerleme yok. Bir ${state.sourceLabel} tamamla.`,
            `${this.commitmentLead(state)}O zamanı iyi değerlendir, bir şeyi bitir.`,
            "Bugünü boş bırakma. Şimdi bir adım at.",
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            state.hasTaskBacklog
              ? "Bugünün listesi hâlâ dokunulmamış. En kolay görevle başla."
              : "Bugün henüz bir şey yapılmadı. Tek küçük bir adım seç ve günü canlı tut.",
            `${this.timeLead(state)}Şimdi hızlı bir kontrol yardımcı olur.`,
            `${this.nameIntro(state, true)}bugün için tek bir adım yeterli.`,
          ]);
        }
      }

      if (state.sourceType === "TASK" || state.hasTaskBacklog) {
        return this.pickThree([
          "Bugün hâlâ hiçbir şey bitmedi. Bir görevi bitir, gün hafifler.",
          `${this.timeLead(state)}Listendeki en kolay görevle başla.`,
          `${this.commitmentLead(state)}İyi yapılan tek bir görev şimdilik yeterli.`,
        ]);
      }

      if (state.sourceType === "HABIT" || state.hasHabitBacklog) {
        return this.pickThree([
          "Bugün henüz alışkanlık ilerlemesi yok. En kolayından başla.",
          `${this.timeLead(state)}Bir tik günü harekete geçirir.`,
          `${this.goalLead(state)}Küçük bir alışkanlık adımıyla rutini canlı tut.`,
        ]);
      }

      return this.pickThree([
        `Bugün henüz ilerleme yok. Bir ${state.sourceLabel} ile başla.`,
        `${this.goalLead(state)}Şimdi başlarsan bugün güzel bitebilir.`,
        `${this.nameIntro(state, false)}basit tut ve bir adım at.`,
      ]);
    }

    if (state.decision.type === "WARNING") {
      if (state.personaTone === "soft") {
        return this.pickThreeLeaf(state, [
          `No progress yet today. Start with one easy ${state.sourceLabel}.`,
          `${this.timeLead(state)}One small action still counts.`,
          `Today is still open. Keep the first step small.`,
        ]);
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          state.hasTaskBacklog
            ? `Nothing is closed yet today. Finish one task now.`
            : `No progress yet today. Complete one ${state.sourceLabel}.`,
          `${this.commitmentLead(state)}Use it on one clear win.`,
          `Do not leave today empty. Take one step now.`,
        ]);
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          state.hasTaskBacklog
            ? `Today's list is still untouched. Start with the easiest task.`
            : `Nothing moved yet today. Pick one small step and keep the day alive.`,
          `${this.timeLead(state)}A quick check-in now would help.`,
          `${this.nameIntro(state, true)}today just needs one useful action.`,
        ], "no_activity_today:warning_friendly");
      }
    }

    if (state.sourceType === "TASK" || state.hasTaskBacklog) {
      return this.pickThreeLeaf(state, [
        `Nothing is closed yet today. Finish one task and the day feels lighter.`,
        `${this.timeLead(state)}Start with the easiest task on your list.`,
        `${this.commitmentLead(state)}A single task done well is enough for now.`,
      ]);
    }

    if (state.sourceType === "HABIT" || state.hasHabitBacklog) {
      return this.pickThreeLeaf(state, [
        `No habit progress yet today. Start with the easiest one.`,
        `${this.timeLead(state)}One checkmark is enough to get the day moving.`,
        `${this.goalLead(state)}Keep the routine alive with one small habit step.`,
      ]);
    }

    return this.pickThreeLeaf(state, [
      `No progress yet today. Start with one ${state.sourceLabel}.`,
      `${this.goalLead(state)}Today can still end well if you start now.`,
      `${this.nameIntro(state, false)}keep it simple and take one step.`,
    ], "no_activity_today:warning_balanced");
  }

  private buildLowEngagementBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "WARNING") {
        if (state.personaTone === "soft" || state.hasHighIgnoreRate) {
          return this.pickThree([
            `Bugün baskı yok. Sadece küçük bir ${state.sourceLabel} yap.`,
            "Büyük bir geri dönüşe gerek yok. Bir adım yeterli.",
            `${this.goalLead(state)}Hafif tut ve rutine bağlı kal.`,
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            `Biraz geride kalıyorsun. Şimdi bir ${state.sourceLabel} bitir.`,
            "Tamamlanmış bir adımla rutini koru.",
            `${this.goalLead(state)}Disiplini sürdürmek, yeniden kazanmaktan çok daha kolaydır.`,
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            "Momentumun biraz düşük. Hızlı bir kazanım onu tekrar canlandırır.",
            `${this.nameIntro(state, true)}bugün için tek küçük bir adım yeterli.`,
            "Şimdi küçük bir sıfırlama, daha büyük birinden iyidir.",
          ]);
        }
      }

      return this.pickThree([
        "Biraz ritimden çıktın. Küçük bir adım seni geri alır.",
        `${this.goalLead(state)}Bugün tutarlılık mükemmellikten daha önemli.`,
        `Bir ${state.sourceLabel} ile rutine yakın kal.`,
      ]);
    }

    if (state.decision.type === "WARNING") {
      if (state.personaTone === "soft" || state.hasHighIgnoreRate) {
        return this.pickThreeLeaf(state, [
          `No pressure today. Just do one small ${state.sourceLabel}.`,
          `You do not need a big comeback. One action is enough.`,
          `${this.goalLead(state)}Keep it light and stay connected to the routine.`,
        ]);
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `You're starting to drift. Get one ${state.sourceLabel} done now.`,
          `Protect the routine with one completed step today.`,
          `${this.goalLead(state)}Discipline is easier to keep than rebuild.`,
        ]);
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `Your momentum is a bit low. One quick win gets it moving again.`,
          `${this.nameIntro(state, true)}today just needs one useful step.`,
          `A small reset now is better than a bigger one later.`,
        ], "low_engagement:warning_friendly");
      }
    }

    return this.pickThreeLeaf(state, [
      `You're a little off rhythm. One small action gets you back in.`,
      `${this.goalLead(state)}Consistency needs attention today, not perfection.`,
      `Stay close to the routine with one ${state.sourceLabel}.`,
    ], "low_engagement:warning_balanced");
  }

  private buildHighStreakBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "CELEBRATION") {
        if (state.personaTone === "strict") {
          return this.pickThree([
            `${this.nameIntro(state, true)}${state.reason.streak} gündesin. Bugün koru.`,
            `Seri güçlü. Standardını koru ve bir ${state.sourceLabel} tamamla.`,
            "Bugünkü payını yap ve seriyi canlı tut.",
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            `${this.nameIntro(state, true)}${state.reason.streak} gün sana yakışıyor. Bugün de devam ettir.`,
            "Gerçekten iyi bir ritimdesin. Bir adım daha onu temiz tutar.",
            "Seri artık gerçek. Kolay bir kazanımla koru.",
          ]);
        }
      }

      return this.pickThree([
        `${this.nameIntro(state, true)}${state.reason.streak} gün üst üste güçlü. Bugün devam et.`,
        "Rutinin çok iyi tutuyor. Bugün de devam et.",
        `Tamamlanmış bir ${state.sourceLabel} seriyi sağlıklı tutar.`,
      ]);
    }

    if (state.decision.type === "CELEBRATION") {
      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `${this.nameIntro(state, true)}you are at ${state.reason.streak} days. Protect it today.`,
          `The streak is strong. Keep your standard and close one ${state.sourceLabel}.`,
          `Do today's part and keep the streak intact.`,
        ], state.reason.intensity === "HIGH"
          ? "high_streak:high_celebration_strict"
          : "high_streak:celebration_strict");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `${this.nameIntro(state, true)}${state.reason.streak} days looks good on you. Keep it alive today.`,
          `You're in a really good rhythm. One more step keeps it clean.`,
          `The streak is real now. Protect it with one easy win.`,
        ], state.reason.intensity === "HIGH"
          ? "high_streak:high_celebration_friendly"
          : "high_streak:celebration_friendly");
      }
    }

    return this.pickThreeLeaf(state, [
      `${this.nameIntro(state, true)}${state.reason.streak} days in a row is strong. Keep going today.`,
      `Your routine is holding up well. Stay with it today.`,
      `One more completed ${state.sourceLabel} keeps the run healthy.`,
    ], state.reason.intensity === "HIGH"
      ? "high_streak:high_celebration_balanced"
      : "high_streak:celebration_balanced");
  }

  private buildHighPerformanceBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "CELEBRATION") {
        if (state.personaTone === "soft") {
          return this.pickThree([
            "Son zamanlarda iyi gidiyorsun. Ritmi koru, baskıyı değil.",
            "Bu tempo işliyor. Nazik ve tutarlı kal.",
            "Bugün bir adım daha yeterli.",
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            "Son zamanlarda çok iyi gidiyorsun. Bugünü de sade ve sabit tut.",
            `${this.nameIntro(state, true)}bu tempo sana uyuyor. Bir küçük kazanım daha güzel oturuyor.`,
            "Şimdiye kadar güçlü bir hafta. Bugünü basit tut.",
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            "Güçlü bir gidişatın var. Bugün de aynı şekilde devam et.",
            "Bu tempo işliyor. Sade tut ve bir adım daha ekle.",
            "Seni buraya getiren rutini koru.",
          ]);
        }
      }

      return this.pickThree([
        "Son zamanlardaki ritmin işliyor. Sıradaki adımı sade tut.",
        `${this.goalLead(state)}Yaptığın şey işliyor, sabit tut.`,
        "İyi gidiyorsun. Seni buraya getiren rutini koru.",
      ]);
    }

    if (state.decision.type === "CELEBRATION") {
      if (state.personaTone === "soft") {
        return this.pickThreeLeaf(state, [
          `You're doing well lately. Keep the rhythm, not the pressure.`,
          `This pace is working. Stay gentle and consistent.`,
          `One more useful step today is enough.`,
        ], state.reason.intensity === "HIGH"
          ? "high_performance:high_celebration_soft"
          : "high_performance:celebration_soft");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `You're doing really well lately. Keep the rhythm, not the pressure.`,
          `${this.nameIntro(state, true)}this pace suits you. One more small win fits nicely.`,
          `Strong week so far. Keep it simple today.`,
        ], state.reason.intensity === "HIGH"
          ? "high_performance:high_celebration_friendly"
          : "high_performance:celebration_friendly");
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `Your consistency is high right now. Protect it today.`,
          `Stay close to the routine that got you here.`,
          `Keep today's next step clean and realistic.`,
        ], state.reason.intensity === "HIGH"
          ? "high_performance:high_celebration_strict"
          : "high_performance:celebration_strict");
      }
    }

    return this.pickThreeLeaf(state, [
      `Your recent pattern is working. Keep the next step clear and simple.`,
      `${this.goalLead(state)}What you're doing is working, so keep it steady.`,
      `You're handling things well. Protect the routine that got you here.`,
    ], state.reason.intensity === "HIGH"
      ? "high_performance:high_celebration_balanced"
      : "high_performance:celebration_balanced");
  }

  private buildStrongDailyProgressBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "CELEBRATION") {
        if (state.personaTone === "soft") {
          return this.pickThree([
            "Bugün güzel ilerliyorsun. Hafif tut ve devam et.",
            `${this.nameIntro(state, false)}bugün güzel gidiyor. Nazik ve sabit tut.`,
            "Şu an momentumun var. Koru, acele etme.",
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            "Bugün verimli ilerledin. Temponu dengede tut.",
            "Güzel bir ivme yakaladın. Sıradaki adımı net bir şekilde tamamla.",
            "Şu ana kadar güçlü gidiyorsun. Sıradaki adımda odağını koru.",
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            "Bugün güzel gidiyor. Momentumu devam ettir.",
            "Birkaç kazanım biriktirdin. Güzel iş çıkarttın.",
            "Bu güçlü bir gün. Tempoyu gerçekçi tut.",
          ]);
        }
      }

      return this.pickThree([
        "Bugün güzel ilerleme. Ritmi devam ettir.",
        `${this.goalLead(state)}Bugün doğru yönde ilerliyor.`,
        "Buradan tek bir bilinçli adım yeterli.",
      ]);
    }

    if (state.decision.type === "CELEBRATION") {
      if (state.personaTone === "soft") {
        return this.pickThreeLeaf(state, [
          `You're making good progress today. No need to force the rest.`,
          `${this.nameIntro(state, false)}today is moving well. Keep it gentle and steady.`,
          `You have momentum now. Protect it, don't rush it.`,
        ], "strong_daily_progress:celebration_soft");
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `Today is productive. Keep the pace controlled.`,
          `You've built momentum. Close the next step cleanly.`,
          `Strong day so far. Stay disciplined with the next action.`,
        ], "strong_daily_progress:celebration_strict");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `Today is going well. Keep the momentum going.`,
          `You've already stacked a few wins. Nice work.`,
          `This is a strong day. Keep the pace realistic.`,
        ], "strong_daily_progress:celebration_friendly");
      }
    }

    return this.pickThreeLeaf(state, [
      `Good progress today. Keep the rhythm going.`,
      `${this.goalLead(state)}Today is moving in the right direction.`,
      `One thoughtful next step is enough from here.`,
    ], "strong_daily_progress:celebration_balanced");
  }

  private buildDailyProgressBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "CELEBRATION") {
        if (state.personaTone === "soft") {
          return this.pickThree([
            "Bugün küçük bir ilerleme bile değerli. Aynı tempoda devam et.",
            "Faydalı bir şey yaptın, bu bugün için yeterince iyi.",
            "İstersen bir küçük kazanım daha ekleyebilirsin.",
          ]);
        }

        if (state.personaTone === "friendly") {
          return this.pickThree([
            "Bugün güzel bir ilerleme. Devam et.",
            `${this.nameIntro(state, true)}iyi başladın. Devam et.`,
            "İyi bir adım atıldı. Devam etmek istersen et.",
          ]);
        }

        if (state.personaTone === "strict") {
          return this.pickThree([
            "Bugün güzel başladın. Üzerine bir küçük adım daha ekle",
            "İşi ileri taşıdın, bu seviyeyi koru",
            "Rutinde kal, bir adım daha tamamla",
          ]);
        }
      }

      return this.pickThree([
        "Bugün güzel bir ilerleme. Ritmini sabit tut.",
        `${this.goalLead(state)}Bugün zaten sayılıyor.`,
        "Buradan devam etmek için tek bir net adım yeterli.",
      ]);
    }

    if (state.decision.type === "CELEBRATION") {
      if (state.personaTone === "soft") {
        return this.pickThreeLeaf(state, [
          `A little progress counts today. Keep going gently.`,
          `You already did something useful. That matters.`,
          `One more small win is plenty if you have room for it.`,
        ], state.decision.type === "CELEBRATION"
          ? "daily_progress:celebration_soft"
          : "daily_progress:neutral_soft");
      }

      if (state.personaTone === "friendly") {
        return this.pickThreeLeaf(state, [
          `Nice progress today. Keep the day moving.`,
          `${this.nameIntro(state, true)}you got started well. Stay with it.`,
          `A good step is already done. Build on it if you can.`,
        ], state.decision.type === "CELEBRATION"
          ? "daily_progress:celebration_friendly"
          : "daily_progress:neutral_friendly");
      }

      if (state.personaTone === "strict") {
        return this.pickThreeLeaf(state, [
          `Good start today. Lock in one more useful step.`,
          `You moved things forward. Keep the standard.`,
          `Stay with the routine and finish one more clean action.`,
        ], state.decision.type === "CELEBRATION"
          ? "daily_progress:celebration_strict"
          : "daily_progress:neutral_strict");
      }
    }

    return this.pickThreeLeaf(state, [
      `Good progress today. Keep the rhythm steady.`,
      `${this.goalLead(state)}Today already counts.`,
      `One solid next step would be enough from here.`,
    ], state.decision.type === "CELEBRATION"
      ? "daily_progress:celebration_balanced"
      : "daily_progress:neutral_balanced");
  }

  private buildSteadyStateBodies(state: FallbackState): string[] {
    if (state.language === "tr") {
      if (state.decision.type === "WARNING") {
        if (state.reason.intensity === "HIGH") {
          if (state.personaTone === "strict") {
            return this.pickThree([
              "Daha fazla aksamasın diye küçük ama net bir adım at.",
              "Bugünü basit tut: tek bir adım bile başlamak için yeterli.",
              "Küçük bir işi tamamlayarak rutinini sürdür.",
            ]);
          }

          return this.pickThree([
            `Bugün bir sıfırlamaya ihtiyaç var. Kolay bir adımla başla.`,
            `${this.goalLead(state)}Sürüklenmeyi durdurmak için küçük bir adım yeterli.`,
            "Şimdi küçük bir sıfırlama beklemekten daha çok yardımcı olur.",
          ]);
        }

        if (state.personaTone === "soft") {
          return this.pickThree([
            `Küçük bir sıfırlama yardımcı olur. Kolay bir ${state.sourceLabel} ile başla.`,
            "Ritmi bugün basit tut.",
            "Şimdilik tek bir adım yeterli.",
          ]);
        }

        return this.pickThree([
          `Küçük bir sıfırlama yardımcı olur. Bir ${state.sourceLabel} ile başla.`,
          `${this.goalLead(state)}Rotadan çok uzak değilsin, sadece bir adım at.`,
          "Basit tut ve bir şeyler yapmaya başla.",
        ]);
      }

      if (state.decision.type === "CELEBRATION") {
        return this.pickThree([
          "Bu tempoyu bugün sabit tut.",
          `${this.goalLead(state)}Yeterince yapıyorsun, sadece tutarlı kal.`,
          "Bugün dramatik bir şey gerekmez. Bir küçük adım daha yeterli.",
        ]);
      }

      return this.pickThree([
        "Ritmi bugün basit tut.",
        `${this.goalLead(state)}Tutarlı kalmak burada mükemmelden daha değerli.`,
        `${this.timeLead(state)}Tek bir adım yeterli.`,
        "Küçük bir adımla rutinini sabit tut.",
      ]);
    }

    if (state.decision.type === "WARNING") {
      if (state.reason.intensity === "HIGH") {
        if (state.personaTone === "strict") {
          return this.pickThreeLeaf(state, [
            `Take one useful step before this slips further.`,
            `Keep it practical today: one step, done well.`,
            `Hold the routine with one completed action.`,
          ], "steady_state:warning_high_strict");
        }

        return this.pickThreeLeaf(state, [
          `Today needs a reset. Start with one manageable ${state.sourceLabel}.`,
          `${this.goalLead(state)}One clean action is enough to stop the drift.`,
          `A small reset now helps more than waiting.`,
        ], "steady_state:warning_high_balanced");
      }

      if (state.personaTone === "soft") {
        return this.pickThreeLeaf(state, [
          `A small reset would help. Start with one easy ${state.sourceLabel}.`,
          `Keep the rhythm simple today.`,
          `One useful step is enough for now.`,
        ], "steady_state:warning_soft");
      }

      return this.pickThreeLeaf(state, [
        `A small reset would help. Start with one ${state.sourceLabel}.`,
        `${this.goalLead(state)}You are not far off track, just take one step.`,
        `Keep it simple and get one useful action done.`,
      ], "steady_state:warning_balanced");
    }

    if (state.decision.type === "CELEBRATION") {
      return this.pickThreeLeaf(state, [
        `Keep this pace steady today.`,
        `${this.goalLead(state)}You're doing enough, just stay consistent.`,
        `Nothing dramatic needed today. One more small step is enough.`,
      ], "steady_state:celebration_balanced");
    }

    return this.pickThreeLeaf(state, [
      `Keep the rhythm simple today.`,
      `${this.goalLead(state)}Steady works better than perfect here.`,
      `${this.timeLead(state)}One useful step is enough.`,
      `Hold the routine with one small action.`,
    ], "steady_state:neutral_balanced");
  }

  private buildState(
    context: UserContextDTO,
    decision: NotificationDecisionResult,
    reason: NotificationReasonData,
    sourceType: NotificationSourceType,
  ): FallbackState {
    const language = context.profile.userLanguage === "tr" ? "tr" : "en";
    return {
      context,
      decision,
      reason,
      sourceType,
      language,
      personaTone: this.resolvePersonaTone(context),
      ageGroup: this.resolveAgeGroup(context.profile.age),
      genderProfile: this.resolveGenderProfile(context.profile.gender),
      sourceLabel: this.resolveSourceLabel(sourceType, reason.focusArea, language),
      username: this.resolveUsername(context.profile.username),
      goal: this.cleanPhrase(context.profile.goals[0] ?? null),
      painPoint: this.cleanPhrase(context.profile.painPoints[0] ?? null),
      disciplineLevel: context.profile.selfDisciplineLevel,
      preferredTime: this.cleanPhrase(context.profile.preferredTime ?? null),
      dailyCommitment: context.profile.dailyCommitment,
      hasHighIgnoreRate: this.hasHighIgnoreRate(context),
      hasCompletionSignal:
        context.notificationFeedback.completions > 0 ||
        context.notificationFeedback.clicks > 0,
      hasPlannedToday: reason.hasAnyPlannedToday,
      hasTaskBacklog: context.taskStats.pendingToday > 0,
      hasHabitBacklog: context.habitStats.activeHabitCount > 0,
      totalDoneToday:
        reason.today.habitCompleted + reason.today.taskCompleted,
      demographicLeaf: this.resolveDemographicLeaf(
        this.resolveAgeGroup(context.profile.age),
        this.resolveGenderProfile(context.profile.gender),
      ),
    };
  }

  private parseReason(reason: string): NotificationReasonData {
    try {
      const parsed = JSON.parse(reason) as Partial<NotificationReasonData>;

      return {
        trigger: parsed.trigger ?? "steady_state",
        intensity: parsed.intensity ?? "LOW",
        avgRate: parsed.avgRate ?? 0,
        habitRate: parsed.habitRate ?? 0,
        taskRate: parsed.taskRate ?? 0,
        streak: parsed.streak ?? 0,
        missedDays: parsed.missedDays ?? 0,
        focusArea: parsed.focusArea ?? "balanced",
        hasAnyPlannedToday: parsed.hasAnyPlannedToday ?? false,
        hadRecentActivity: parsed.hadRecentActivity ?? false,
        today: {
          habitCompleted: parsed.today?.habitCompleted ?? 0,
          taskCompleted: parsed.today?.taskCompleted ?? 0,
        },
        motivationType: parsed.motivationType ?? null,
      };
    } catch {
      return {
        trigger: "steady_state",
        intensity: "LOW",
        avgRate: 0,
        habitRate: 0,
        taskRate: 0,
        streak: 0,
        missedDays: 0,
        focusArea: "balanced",
        hasAnyPlannedToday: false,
        hadRecentActivity: false,
        today: {
          habitCompleted: 0,
          taskCompleted: 0,
        },
        motivationType: null,
      };
    }
  }

  private resolvePersonaTone(
    context: UserContextDTO,
  ): "soft" | "friendly" | "strict" | "balanced" {
    const tone = (context.profile.tonePreference ?? "").toLowerCase();
    const motivation = (context.profile.motivationType ?? "").toLowerCase();

    if (tone.includes("soft")) return "soft";
    if (tone.includes("friendly")) return "friendly";
    if (
      tone.includes("strict") ||
      tone.includes("direct") ||
      motivation.includes("discipline")
    ) {
      return "strict";
    }

    return "balanced";
  }

  private resolveAgeGroup(
    age: number | null,
  ): "teen" | "young_adult" | "adult" | "mature" | "unknown" {
    if (!age || age < 13) return "unknown";
    if (age <= 19) return "teen";
    if (age <= 26) return "young_adult";
    if (age <= 44) return "adult";
    return "mature";
  }

  private resolveGenderProfile(
    gender: string | null,
  ): "female" | "male" | "nonbinary" | "other" | "unknown" {
    const value = (gender ?? "").trim().toLowerCase();

    if (!value) return "unknown";
    if (value === "female" || value === "woman") return "female";
    if (value === "male" || value === "man") return "male";
    if (value === "nonbinary" || value === "non-binary") return "nonbinary";
    return "other";
  }

  private resolveDemographicLeaf(
    ageGroup: FallbackState["ageGroup"],
    genderProfile: FallbackState["genderProfile"],
  ): FallbackState["demographicLeaf"] {
    if (ageGroup === "teen" || ageGroup === "young_adult") {
      if (genderProfile === "female") return "young_female";
      if (genderProfile === "male") return "young_male";
      if (genderProfile === "unknown") return "young_unknown_gender";
      return "young_other";
    }

    if (ageGroup === "adult") {
      if (genderProfile === "female") return "adult_female";
      if (genderProfile === "male") return "adult_male";
      if (genderProfile === "unknown") return "adult_unknown_gender";
      return "adult_other";
    }

    if (ageGroup === "mature") {
      if (genderProfile === "female") return "mature_female";
      if (genderProfile === "male") return "mature_male";
      if (genderProfile === "unknown") return "mature_unknown_gender";
      return "mature_other";
    }

    if (genderProfile === "female") return "unknown_age_female";
    if (genderProfile === "male") return "unknown_age_male";
    if (genderProfile !== "unknown") return "unknown_age_other";

    return "generic_unknown_demo";
  }

  private resolveSourceLabel(
    sourceType: NotificationSourceType,
    focusArea: NotificationReasonData["focusArea"],
    language: "en" | "tr",
  ): string {
    if (language === "tr") {
      if (sourceType === "TASK") return "görev";
      if (sourceType === "HABIT") return "alışkanlık";
      if (sourceType === "FLOWER") return "kontrol";
      if (focusArea === "task") return "görev";
      if (focusArea === "habit") return "alışkanlık";
      return "adım";
    }

    if (sourceType === "TASK") return "task";
    if (sourceType === "HABIT") return "habit";
    if (sourceType === "FLOWER") return "check-in";
    if (focusArea === "task") return "task";
    if (focusArea === "habit") return "habit";
    return "step";
  }

  private resolveUsername(username: string | null): string | null {
    if (!username || !username.trim()) {
      return null;
    }

    return username.trim();
  }

  private nameIntro(state: FallbackState, includeName: boolean): string {
    if (includeName && state.username) {
      return `${state.username}, `;
    }

    return "";
  }

  private goalLead(state: FallbackState): string {
    if (!state.goal) {
      return "";
    }

    if (state.language === "tr") {
      return `${this.capitalize(state.goal)} küçük adımlarla ilerliyor. `;
    }

    return `${this.capitalize(state.goal)} still moves with small steps. `;
  }

  private timeLead(state: FallbackState): string {
    if (!state.preferredTime) {
      return "";
    }

    if (state.language === "tr") {
      return `Her zamanki ${state.preferredTime.toLowerCase()} vaktini hâlâ kullanabilirsin. `;
    }

    return `Your usual ${state.preferredTime.toLowerCase()} window can still work for you. `;
  }

  private commitmentLead(state: FallbackState): string {
    if (!state.dailyCommitment) {
      return "";
    }

    if (state.language === "tr") {
      return `${state.dailyCommitment} dakikan var, iyi değerlendirirsen yeterli. `;
    }

    return `${state.dailyCommitment} minutes is enough if you use it well. `;
  }

  private hasHighIgnoreRate(context: UserContextDTO): boolean {
    return (
      context.notificationFeedback.totalTracked > 0 &&
      context.notificationFeedback.ignores >=
        Math.ceil(context.notificationFeedback.totalTracked / 2)
    );
  }

  private cleanPhrase(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : null;
  }

  private capitalize(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private pickThree(items: string[]): string[] {
    return items.slice(0, 3).map((item) => this.normalizeCopy(item));
  }

  private pickThreeLeaf(
    state: FallbackState,
    items: string[],
    key?: string,
  ): string[] {
    if (key) {
      const specific = this.getSpecificLeafSet(state, key);

      if (specific) {
        return this.pickThree(specific);
      }
    }

    return this.pickThree(
      items.map((item) =>
        this.appendLeafTone(item, this.getDemographicTail(state)),
      ),
    );
  }

  private getSpecificLeafSet(
    state: FallbackState,
    key: string,
  ): string[] | null {
    const fullKey = `${key}:${state.demographicLeaf}`;

    const sets: Record<string, string[]> = {
      "streak_break:warning_high_soft:young_female": [
        `${this.nameIntro(state, true)}the streak broke today. Keep it simple and take one quick ${state.sourceLabel}.`,
        "That streak mattered. Start the next one with one small win tonight.",
        "You do not need a dramatic reset, just one useful step today.",
      ],
      "streak_break:warning_high_soft:young_male": [
        `${this.nameIntro(state, true)}the streak broke today. Get one ${state.sourceLabel} done and settle it.`,
        "One clean win today is enough to start the rebuild.",
        "Do not let the break grow. Close one useful step now.",
      ],
      "streak_break:warning_high_soft:young_unknown_gender": [
        `${this.nameIntro(state, true)}the streak broke today. One step gets the rebuild moving.`,
        "That streak can start again today with one small win.",
        "Keep the reset simple and take one useful action.",
      ],
      "streak_break:warning_soft:adult_female": [
        "Your streak paused today. One practical step gets you back on track.",
        "Keep the reset light and let one useful step do the work.",
        "A calm restart today is enough to protect the routine.",
      ],
      "streak_break:warning_soft:adult_male": [
        "The streak slipped today. Close one thing and reset it cleanly.",
        "One proper win today is enough to start again.",
        "Keep it simple and finish one useful step.",
      ],
      "no_activity_today:warning_friendly:young_female": [
        "Nothing has moved yet today. Start with one easy win and let the day open up.",
        "A quick useful step now would be enough to shift the mood of today.",
        "You do not need a big push, just one useful action.",
      ],
      "no_activity_today:warning_friendly:young_male": [
        "Still nothing done today. Pick one thing and close it.",
        "One clean win changes the whole feel of the day.",
        "Do not leave today empty. Finish one useful step.",
      ],
      "no_activity_today:warning_balanced:adult_female": [
        "No progress yet today. Start with one practical step and make the day lighter.",
        "A single completed step is enough to get today moving.",
        "Keep it simple and just begin with one useful action.",
      ],
      "no_activity_today:warning_balanced:adult_male": [
        "Nothing is closed yet today. Finish one thing and reset the day.",
        "One completed step is enough for now.",
        "Keep it direct today: one useful action, done properly.",
      ],
      "no_activity_today:warning_soft:unknown_age_female": [
        "Today is still open. Start with one easy step and let that be enough.",
        "A quick useful action now would help more than waiting.",
        "One calm start is enough to shift the day.",
      ],
      "no_activity_today:warning_strict:unknown_age_male": [
        "Still no progress today. Pick one thing and finish it.",
        "One clean action changes the day fast.",
        "Do not leave today empty. Close one useful step.",
      ],
      "low_engagement:warning_friendly:young_female": [
        "Your momentum feels low today. One light win is enough to reconnect.",
        "Keep it soft and do one small step.",
        "A quick useful action now would help a lot.",
      ],
      "low_engagement:warning_strict:young_male": [
        "You're drifting a bit. Take one clear step and stop it there.",
        "One quick win gets the rhythm back.",
        "Do not wait for motivation, just close one useful action.",
      ],
      "low_engagement:warning_balanced:adult_female": [
        "You are a little off rhythm. One practical step gets you back in.",
        "Keep today light and stay close to the routine.",
        "One useful action is enough to reset the day.",
      ],
      "low_engagement:warning_balanced:adult_male": [
        "You're slipping off rhythm. One completed step helps right away.",
        "Keep it simple and get one clear win.",
        "One practical action is enough to stabilize things.",
      ],
      "high_streak:celebration_friendly:young_female": [
        `${this.nameIntro(state, true)}${state.reason.streak} days looks really good. Keep it alive with one easy win today.`,
        "This streak has real shape now. One small step keeps it glowing.",
        "You're in a great rhythm. Keep it light and keep it going.",
      ],
      "high_streak:celebration_strict:young_male": [
        `${this.nameIntro(state, true)}${state.reason.streak} days strong. Protect it with one clean action today.`,
        "The streak is real now. One proper win keeps it moving.",
        "Stay sharp and keep the run alive today.",
      ],
      "high_streak:celebration_balanced:adult_female": [
        "Your streak is holding beautifully. One practical step keeps it steady today.",
        "This rhythm is working. Keep it light and consistent.",
        "One calm win today protects the streak well.",
      ],
      "high_streak:celebration_balanced:adult_male": [
        "Your streak is strong. Keep it going with one clean step today.",
        "This run is healthy. One useful action protects it.",
        "Stay with the routine and keep the streak intact.",
      ],
      "high_performance:celebration_friendly:adult_female": [
        "You're doing really well lately. Keep it practical and steady today.",
        "This pace is working for you. One more useful step is enough.",
        "Stay close to what's already working.",
      ],
      "high_performance:celebration_strict:adult_male": [
        "You're on a strong run. Keep it going with one clean action today.",
        "This pace works. Stay simple and finish one more useful step.",
        "Protect the standard that got you here.",
      ],
      "high_performance:celebration_friendly:young_unknown_gender": [
        "You're on a good run lately. Keep it going with one easy win today.",
        "This pace suits you. One more useful step fits nicely.",
        "Keep the rhythm alive without overdoing it.",
      ],
      "strong_daily_progress:celebration_soft:young_female": [
        "Today is going well. Keep it light and let the momentum carry.",
        "You already have good movement today, no need to force the rest.",
        "One more small useful step would be enough if you want it.",
      ],
      "strong_daily_progress:celebration_strict:young_male": [
        "Strong day so far. Keep the pace controlled and useful.",
        "You built momentum today. Close the next step cleanly.",
        "Finish the day with one more clear action if it helps.",
      ],
      "strong_daily_progress:celebration_balanced:adult_female": [
        "Today is moving in a very good direction. Keep it practical and steady.",
        "You've built good momentum. One calm useful step is enough from here.",
        "This is a productive day. Let the rest stay simple.",
      ],
      "strong_daily_progress:celebration_balanced:adult_male": [
        "You have strong momentum today. Keep the next step clean.",
        "This is a good day. One more practical action would be enough.",
        "Stay measured and finish the day well.",
      ],
      "strong_daily_progress:celebration_friendly:mature_unknown_gender": [
        "Today is going well. Keep the pace light and controlled.",
        "You already built meaningful momentum today.",
        "One more useful step is enough if you want to keep it moving.",
      ],
      "daily_progress:celebration_soft:young_female": [
        "A little progress counts today. Keep it light and keep going.",
        "You already did something useful, and that matters a lot today.",
        "One more small win would be plenty if you want it.",
      ],
      "daily_progress:celebration_strict:young_male": [
        "Good start today. Lock in one more useful step.",
        "You moved things forward. Keep the standard steady.",
        "Stay with the routine and finish one more clean action.",
      ],
      "daily_progress:celebration_balanced:adult_female": [
        "Good progress today. Keep the day practical and steady.",
        "Today already counts. One more useful step would be enough.",
        "You have momentum now, keep it simple from here.",
      ],
      "daily_progress:celebration_balanced:adult_male": [
        "Good movement today. Keep the rhythm clean.",
        "One solid next step would be enough from here.",
        "Stay practical and let today's progress hold.",
      ],
      "daily_progress:neutral_balanced:unknown_age_other": [
        "You moved in the right direction today. Keep it simple from here.",
        "A useful step is already done. That still matters.",
        "One more small action would be enough if you have room for it.",
      ],
      "steady_state:warning_soft:young_unknown_gender": [
        "A small reset would help. Start with one easy step.",
        "Keep the rhythm simple today and stay in motion.",
        "One useful action is enough for now.",
      ],
      "steady_state:warning_high_strict:adult_male": [
        "Take one useful step before this drifts further.",
        "Keep it practical today: one clear action.",
        "Hold the routine with one completed step.",
      ],
      "steady_state:warning_balanced:adult_female": [
        "A small reset would help. Start with one practical step.",
        "You are not far off track, just take one useful action.",
        "Keep today simple and let one win be enough.",
      ],
      "steady_state:celebration_balanced:mature_male": [
        "Keep this pace steady today. It's working well.",
        "One measured useful step is enough from here.",
        "Stay with the routine and keep the day clean.",
      ],
      "steady_state:neutral_balanced:generic_unknown_demo": [
        "Keep the rhythm simple today.",
        "One useful step is enough to hold the routine.",
        "Steady works better than perfect here.",
      ],
      "severe_drop:warning_high_soft:young_female": [
        "This week has been heavier than usual. Keep today gentle and do one useful step.",
        "You do not need to fix everything today, just take one small action.",
        "A light reset today is enough to stop the slide.",
      ],
      "severe_drop:warning_high_soft:young_male": [
        "Your pace dropped this week. Get one clean win and reset the day.",
        "One useful action today is enough to stop the dip.",
        "Keep it simple and close one thing properly.",
      ],
      "severe_drop:warning_strict:adult_female": [
        "Your pace is slipping. One practical completed step helps right now.",
        "Reset the standard with one useful win today.",
        "Keep today clear and finish one thing properly.",
      ],
      "severe_drop:warning_strict:adult_male": [
        "You are below your usual pace. Fix it with one clean action today.",
        "Take one clear step and stop the drop here.",
        "One finished task is enough to start the reset.",
      ],
      "severe_drop:warning_balanced:mature_female": [
        "Your pace has softened. A calm practical reset would help today.",
        "One steady action today is enough to change the direction.",
        "Keep it measured and get one useful step done.",
      ],
      "severe_drop:warning_balanced:mature_male": [
        "Momentum is low right now. One measured step helps stabilize it.",
        "A practical reset today starts with one completed action.",
        "Take one useful step and keep the drift contained.",
      ],
      "severe_drop:warning_friendly:unknown_age_other": [
        "This patch feels messy, but one useful action today still matters.",
        "Keep the reset light and take one manageable step.",
        "One small win today interrupts the slide.",
      ],
    };

    return sets[fullKey] ?? null;
  }

  private getDemographicTail(state: FallbackState): string {
    switch (state.demographicLeaf) {
      case "young_female":
        return "Keep it light and let one win carry the rest.";
      case "young_male":
        return "A quick clean win will do a lot here.";
      case "young_other":
      case "young_unknown_gender":
        return "A small step now can change the whole day.";
      case "adult_female":
        return "Keep it practical and let the day feel lighter.";
      case "adult_male":
        return "Keep it simple and close one thing properly.";
      case "adult_other":
      case "adult_unknown_gender":
        return "One steady action is enough to move this forward.";
      case "mature_female":
        return "A calm, steady step will be enough today.";
      case "mature_male":
        return "A measured next step is the right call here.";
      case "mature_other":
      case "mature_unknown_gender":
        return "A steady move now is enough for today.";
      case "unknown_age_female":
        return "A calm practical step would fit well here.";
      case "unknown_age_male":
        return "One direct useful action would do a lot here.";
      case "unknown_age_other":
        return "One small useful move is enough for today.";
      case "generic_unknown_demo":
      default:
        return "";
    }
  }

  private appendLeafTone(base: string, extra: string): string {
    if (!extra) {
      return base;
    }

    return `${base} ${extra}`;
  }

  private normalizeCopy(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private trimForNotification(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    const trimmed = value.slice(0, maxLength - 1);
    const lastSpace = trimmed.lastIndexOf(" ");

    if (lastSpace < 24) {
      return `${trimmed.trim()}...`;
    }

    return `${trimmed.slice(0, lastSpace).trim()}...`;
  }
}

export const notificationFallbackService =
  new NotificationFallbackService();
