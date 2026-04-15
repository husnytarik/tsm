(function () {
  const canvas = document.getElementById("rain-canvas");
  const ctx = canvas.getContext("2d");
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  class Streak {
    constructor(init) {
      this.reset(init);
    }
    reset(init) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : -30;
      this.len = 50 + Math.random() * 90;
      this.speed = 9 + Math.random() * 13;
      this.alpha = 0.04 + Math.random() * 0.08;
      this.angle = 0.08 + Math.random() * 0.05;
      this.width = 0.4 + Math.random() * 0.7;
    }
    update() {
      this.y += this.speed;
      this.x += this.speed * this.angle;
      if (this.y - this.len > H || this.x > W) this.reset(false);
    }
    draw() {
      const dx = this.len * this.angle;
      const g = ctx.createLinearGradient(
        this.x - dx,
        this.y - this.len,
        this.x,
        this.y,
      );
      g.addColorStop(0, `rgba(180,210,255,0)`);
      g.addColorStop(0.5, `rgba(190,215,255,${this.alpha})`);
      g.addColorStop(1, `rgba(200,225,255,0)`);
      ctx.beginPath();
      ctx.moveTo(this.x - dx, this.y - this.len);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = g;
      ctx.lineWidth = this.width;
      ctx.stroke();
    }
  }

  const streaks = Array.from({ length: 130 }, (_, i) => new Streak(true));

  function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, W, H);
    streaks.forEach((s) => {
      s.update();
      s.draw();
    });
  }
  animate();
})();
