import { roastHover, scrollToPage } from '../scrollBus'

function Marquee({ text }: { text: string }) {
  const chunk = Array(6).fill(text).join('  ')
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        <span>{chunk}</span>
        <span>{chunk}</span>
      </div>
    </div>
  )
}

const ROASTS = [
  {
    name: 'LOW ORBIT',
    profile: 'Light roast',
    notes: 'Jasmine · bergamot · white peach',
    price: '€14 / 250 g',
  },
  {
    name: 'TRANSFER',
    profile: 'Medium roast',
    notes: 'Caramel · hazelnut · red apple',
    price: '€13 / 250 g',
  },
  {
    name: 'RE-ENTRY',
    profile: 'Dark roast',
    notes: 'Dark chocolate · molasses · smoke',
    price: '€12 / 250 g',
  },
]

export default function Interface() {
  return (
    <div className="interface">
      {/* 0 — Hero */}
      <section className="section section--center section--hero">
        <p className="tagline">Specialty roastery · Porto, Earth</p>
        <h1 className="hero-title">
          Coffee
          <br />
          with <em>gravity</em>.
        </h1>
        <p className="hero-sub">
          Small-lot beans pulled from two hemispheres and roasted like re-entry — precise, hot,
          unforgettable. Everything here orbits the cup.
        </p>
        <button className="cta" onClick={() => scrollToPage(1)}>
          Begin descent ↓
        </button>
        <div className="scroll-hint">
          <span className="scroll-hint__line" />
          <span className="scroll-hint__label">scroll</span>
        </div>
      </section>

      {/* 1 — Origin */}
      <section className="section section--left" data-num="01">
        <p className="kicker">01 — Origin</p>
        <h2>
          Two farms.
          <br />
          One <em>obsession</em>.
        </h2>
        <p className="body">
          Fazenda Vértice sits at 1,250 metres in Caparaó, Brazil — volcanic soil, slow-ripened
          yellow catuaí, honey-processed on raised beds. Adola Highlands grows heirloom varietals
          at 2,050 metres in Yirgacheffe, Ethiopia, washed in spring water and dried under thin
          mountain air. We buy the whole harvest, every year, at prices the farmers set.
        </p>
        <p className="hint">→ hover the planets</p>
      </section>

      {/* 2 — Roasts */}
      <section className="section section--left" data-num="02">
        <p className="kicker">02 — Roasts</p>
        <h2>
          Pick your
          <br />
          <em>trajectory</em>.
        </h2>
        <ul className="roasts">
          {ROASTS.map((r, i) => (
            <li
              key={r.name}
              onMouseEnter={() => (roastHover.index = i)}
              onMouseLeave={() => (roastHover.index = -1)}
            >
              <span className="roasts__num">{`0${i + 1}`}</span>
              <span className="roasts__main">
                <strong>{r.name}</strong>
                <span className="roasts__profile">{r.profile}</span>
                <span className="roasts__notes">{r.notes}</span>
              </span>
              <span className="roasts__price">{r.price}</span>
            </li>
          ))}
        </ul>
        <p className="hint">→ hover a roast: gravity pulls the beans tight</p>
      </section>

      {/* 3 — Brew */}
      <section className="section section--left" data-num="03">
        <p className="kicker">03 — Brew</p>
        <h2>
          Press. Plunge.
          <br />
          <em>Land</em>.
        </h2>
        <p className="body">
          Full immersion is the forgiving way down: 60 grams per litre, water just off the boil,
          four minutes thirty of patient steeping. Then the plunge — slow, steady, all the way to
          touchdown. Keep scrolling and bring it home yourself.
        </p>
        <p className="hint">→ scroll to plunge</p>
      </section>

      {/* 4 — Pour */}
      <section className="section section--left" data-num="04">
        <p className="kicker">04 — Pour</p>
        <h2>
          Gravity does
          <br />
          the <em>rest</em>.
        </h2>
        <p className="body">
          The V60 is orbital mechanics in ceramic: a 1:16 ratio, concentric pours, and a free-fall
          of bloom-sweet droplets into the carafe below. Your scroll is the kettle — move fast and
          the stream races, ease off and it slows to a drip.
        </p>
        <p className="hint">→ scroll speed controls the pour</p>
      </section>

      {/* 5 — Club */}
      <section className="section section--center" data-num="05">
        <p className="kicker">05 — The Orbital Club</p>
        <h2>
          Join the <em>orbit</em>.
        </h2>
        <p className="body body--center">
          Two fresh bags in your letterbox every month, roasted no more than 72 hours before
          launch. Swap roasts, pause, or eject any time — no contracts, no junk fees.
        </p>
        <div className="stats">
          <div>
            <strong>2</strong>
            <span>bags / month</span>
          </div>
          <div>
            <strong>12</strong>
            <span>origins / year</span>
          </div>
          <div>
            <strong>€18</strong>
            <span>per month</span>
          </div>
        </div>
        <button className="cta" onClick={() => scrollToPage(6)}>
          Enter the club →
        </button>
      </section>

      {/* 6 — Contact */}
      <section className="section section--center" data-num="06">
        <Marquee text="STAY CAFFEINATED — STAY IN ORBIT —" />
        <p className="kicker">06 — Contact</p>
        <h2>
          Fall into our
          <br />
          <em>gravity well</em>.
        </h2>
        <a className="cta cta--big" href="mailto:hello@orbital.coffee">
          hello@orbital.coffee
        </a>
        <footer className="footer">
          <span>ORBITAL® {new Date().getFullYear()}</span>
          <span>Roasted in Porto — poured everywhere</span>
        </footer>
      </section>
    </div>
  )
}
