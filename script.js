const root = document.documentElement;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Preloader: a short moment on the hairline, then the page */
(function preloader() {
  const finish = () => {
    root.classList.remove('is-loading');
    root.classList.add('is-leaving');
    setTimeout(() => root.classList.remove('is-leaving'), 900);
  };
  if (calm) return finish();

  const word = document.querySelector('.preloader__word');
  const words = ['songs', 'records', 'mixes'];
  let i = 0;
  const cycle = setInterval(() => {
    word.classList.add('is-changing');
    setTimeout(() => {
      i = (i + 1) % words.length;
      word.textContent = words[i];
      word.classList.remove('is-changing');
    }, 350);
  }, 800);
  setTimeout(() => { clearInterval(cycle); finish(); }, 2400);
})();

/* Menu */
(function menu() {
  const toggle = document.querySelector('.menu-toggle');
  const panel = document.getElementById('menu');
  const set = (open) => {
    panel.hidden = !open;
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => set(panel.hidden));
  panel.addEventListener('click', (event) => { if (event.target.closest('a')) set(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) { set(false); toggle.focus(); }
  });
})();

/* Background music. Browsers only allow sound after a click, tap or key press, so it starts on the first one. */
(function music() {
  const audio = document.getElementById('bgm');
  const toggle = document.querySelector('.sound-toggle');
  const level = .6;
  let fade;

  const play = () => {
    clearInterval(fade);
    audio.volume = 0;
    fade = setInterval(() => {
      audio.volume = Math.min(level, audio.volume + level / 24);
      if (audio.volume >= level) clearInterval(fade);
    }, 50);
    return audio.play();
  };

  const disarm = () => {
    document.removeEventListener('click', first);
    document.removeEventListener('keydown', first);
  };

  function first(event) {
    if (event.target.closest?.('.sound-toggle')) return;
    // Some keys, such as Tab, don't count as permission. Stay ready for the next one.
    play().then(disarm).catch(() => {});
  }

  document.addEventListener('click', first);
  document.addEventListener('keydown', first);

  toggle.addEventListener('click', () => {
    disarm();
    if (audio.paused) play().catch(() => {});
    else audio.pause();
  });

  const show = () => {
    toggle.classList.toggle('is-playing', !audio.paused);
    toggle.setAttribute('aria-pressed', String(!audio.paused));
  };
  audio.addEventListener('play', show);
  audio.addEventListener('pause', show);

  // Clicking into a video or SoundCloud player hands the sound over to it.
  addEventListener('blur', () => {
    if (document.activeElement?.tagName !== 'IFRAME') return;
    disarm();
    audio.pause();
  });
})();

/* Scroll-linked moments: About and Projects hold still while a highlight moves down their lists */
(function scrollMotion() {
  const sheet = document.querySelector('[data-sheet]');
  const lights = [...document.querySelectorAll('[data-chrome="light"]')];

  const groups = [
    {
      section: document.querySelector('.story'),
      pin: document.querySelector('.story__pin'),
      items: [...document.querySelectorAll('.point')],
      windows: [],
      perItem: .35, // screens of scrolling spent on each item
    },
    {
      section: document.querySelector('.projects'),
      pin: document.querySelector('.projects__pin'),
      items: [...document.querySelectorAll('.item')],
      windows: [...document.querySelectorAll('.stage .frame')],
      perItem: .35,
    },
  ].map((group) => ({ ...group, active: -1, travel: 0, pinned: false }));

  // A player someone has used gets reloaded when it hides, so its sound can't carry on unseen.
  addEventListener('blur', () => {
    const focused = document.activeElement;
    if (focused?.tagName === 'IFRAME') focused.dataset.used = 'true';
  });

  const setActive = (group, index) => {
    if (group.active === index) return;
    const previous = group.windows[group.active]?.querySelector('iframe');
    if (previous?.dataset.used) {
      delete previous.dataset.used;
      previous.src = previous.src;
    }
    group.active = index;
    group.items.forEach((item, i) => item.classList.toggle('is-active', i === index));
    group.windows.forEach((frame, i) => frame.classList.toggle('is-active', i === index));
  };

  // Pin only if everything truly fits. Otherwise it scrolls normally with everything showing.
  const fits = (group) => {
    const style = getComputedStyle(group.pin);
    const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    if (group.windows.length) {
      // Try each project open in turn, since the longest one has to fit too.
      const list = group.pin.querySelector('.projects__list');
      let tallest = 0;
      group.items.forEach((_, open) => {
        group.items.forEach((item, i) => item.classList.toggle('is-active', i === open));
        tallest = Math.max(tallest, list.offsetHeight);
      });
      group.items.forEach((item, i) => item.classList.toggle('is-active', i === group.active));
      // Stacked on a phone, the window below the list must still hold a readable Instagram post.
      const stacked = matchMedia('(max-width: 760px)').matches;
      return tallest + pad + (stacked ? 500 : 0) <= innerHeight;
    }
    return group.pin.firstElementChild.offsetHeight + pad <= innerHeight;
  };

  const measure = () => {
    groups.forEach((group) => {
      if (group.active < 0) setActive(group, 0);
      // Measured in its pinned form, since that is the form that has to fit.
      group.section.classList.add('is-measuring', 'is-pinned');
      group.pinned = !calm && fits(group);
      group.section.classList.toggle('is-pinned', group.pinned);
      void group.section.offsetHeight;
      group.section.classList.remove('is-measuring');
      if (group.pinned) {
        group.travel = group.items.length * group.perItem * innerHeight;
        group.section.style.height = `${group.travel + innerHeight}px`;
      } else {
        group.section.style.height = '';
      }
    });
    update();
  };

  const update = () => {
    groups.forEach((group) => {
      if (!group.pinned) return;
      const progress = Math.min(.999, Math.max(0, -group.section.getBoundingClientRect().top / group.travel));
      setActive(group, Math.floor(progress * group.items.length));
    });
    if (!calm) {
      const top = sheet.parentElement.getBoundingClientRect().top;
      const t = Math.min(1, Math.max(0, top / innerHeight));
      sheet.style.transform = `translateY(${t * 8}vh) rotate(${-t * 9}deg) scale(${1 + t * .12})`;
    }
    const middle = innerHeight / 2;
    root.classList.toggle('on-light', lights.some((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= middle && r.bottom >= middle;
    }));
  };

  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  measure();
})();

/* Smoke: domain-warped noise drawn on the graphics card, only while on screen */
(function smoke() {
  const vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  // Phones treat mediump as 16-bit, which turns the noise below into a flat, frozen gradient.
  const fragment = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 res; uniform float time; uniform float warm;
    float hash(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return v;}
    void main(){
      vec2 uv=gl_FragCoord.xy/res;
      vec2 q=uv*vec2(res.x/res.y,1.)*1.6;
      float t=time*.035;
      vec2 w=vec2(fbm(q+vec2(0.,t)),fbm(q+vec2(5.2,-t)));
      float s=fbm(q+2.2*w+vec2(t*.6,-t*.4));
      float sweep=smoothstep(.12,.88,uv.x+(s-.5)*.75);
      sweep=mix(sweep,.72+s*.28,warm);
      vec3 night=vec3(.102,.067,.035);
      vec3 ember=vec3(.43,.16,.06);
      vec3 flame=vec3(.75,.28,.08);
      vec3 c=mix(night,ember,smoothstep(0.,.55,sweep));
      c=mix(c,flame,smoothstep(.45,1.,sweep));
      c+=vec3(.05,.02,.005)*smoothstep(.45,.8,s);
      c+=(hash(gl_FragCoord.xy+time)-.5)*.022;
      gl_FragColor=vec4(c,1.);
    }`;

  document.querySelectorAll('[data-smoke]').forEach((canvas) => {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) { canvas.remove(); return; }

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const res = gl.getUniformLocation(program, 'res');
    const time = gl.getUniformLocation(program, 'time');
    gl.uniform1f(gl.getUniformLocation(program, 'warm'), canvas.dataset.smoke === 'footer' ? 1 : 0);

    const size = () => {
      // Soft by nature, so half resolution looks the same and runs far lighter.
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * .5));
      canvas.height = Math.max(1, Math.round(r.height * .5));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(res, canvas.width, canvas.height);
    };

    const draw = (now) => {
      gl.uniform1f(time, 40 + now / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let visible = false;
    let frame = 0;
    const loop = (now) => {
      draw(now);
      if (visible && !calm) frame = requestAnimationFrame(loop);
    };

    addEventListener('resize', () => { size(); draw(performance.now()); });
    size();
    draw(0);

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !calm) frame = requestAnimationFrame(loop);
    }).observe(canvas);
  });
})();

/* Cursor: mouse users only, and left native if motion is unwelcome */
(function cursor() {
  if (calm || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="cursor__ring"></span><span class="cursor__meter"><i></i><i></i><i></i></span>';
  document.body.append(el);
  const ring = el.querySelector('.cursor__ring');
  const bars = [...el.querySelectorAll('i')];

  const mouse = { x: 0, y: 0 };
  const lag = { x: 0, y: 0 };
  let level = 0;
  let running = false;

  const tick = (now) => {
    const dx = mouse.x - lag.x;
    const dy = mouse.y - lag.y;
    lag.x += dx * .2;
    lag.y += dy * .2;

    const speed = Math.hypot(dx, dy);
    level += (Math.min(1, speed / 90) - level) * .18;

    el.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    ring.style.transform = `translate3d(${lag.x - mouse.x}px, ${lag.y - mouse.y}px, 0)`;
    bars.forEach((bar, i) => {
      const wave = .5 + .5 * Math.sin(now / 70 + i * 2.1);
      bar.style.transform = `scaleY(${.18 + level * (.35 + wave * .65)})`;
    });

    if (speed > .1 || level > .01) requestAnimationFrame(tick);
    else running = false;
  };
  const wake = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  };

  // Players are separate windows, and browsers don't reliably report the mouse entering one.
  // So hand back to the normal cursor whenever the mouse rests beside a player or ends up over one.
  const players = [...document.querySelectorAll('iframe')];
  const NEAR = 60;
  let idle = 0;

  const handBack = () => {
    el.classList.remove('is-visible');
    root.classList.remove('has-cursor');
  };
  const nearPlayer = () => players.some((player) => {
    if (getComputedStyle(player).visibility === 'hidden') return false;
    const r = player.getBoundingClientRect();
    return mouse.x > r.left - NEAR && mouse.x < r.right + NEAR
      && mouse.y > r.top - NEAR && mouse.y < r.bottom + NEAR;
  });

  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    if (!root.classList.contains('has-cursor')) {
      root.classList.add('has-cursor');
      lag.x = event.clientX;
      lag.y = event.clientY;
    }
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    el.classList.add('is-visible');
    wake();
    clearTimeout(idle);
    idle = setTimeout(() => { if (nearPlayer()) handBack(); }, 120);
  }, { passive: true });

  addEventListener('scroll', () => {
    if (document.elementFromPoint(mouse.x, mouse.y)?.tagName === 'IFRAME') handBack();
  }, { passive: true });

  // What sits under the pointer decides the cursor's colour and state.
  document.addEventListener('pointerover', (event) => {
    const target = event.target;
    if (target.tagName === 'IFRAME') { handBack(); return; }
    el.classList.toggle('is-on-link', !!target.closest('a, button'));
    el.classList.toggle('is-on-light', !!target.closest('.mixing') && !target.closest('.menu'));
  });
  document.documentElement.addEventListener('pointerleave', handBack);
  addEventListener('pointerdown', () => el.classList.add('is-pressed'));
  addEventListener('pointerup', () => el.classList.remove('is-pressed'));
})();
