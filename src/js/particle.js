import { bilinear, if_undefined } from "./util";

class VectorField {
    constructor(u, v, dx, dy) {
        // Arguments:
        //  u: 2D matrix representing u component of vector field, in m/s
        //  v: 2D matrix representing v component of vector field, in m/s
        //  dx (optional, default=1): the width of each cell in the field, in pixels
        //  dy (optional, default=dx): the height of each cell in the field, in pixels
        this.u = u;
        this.v = v;
        this.dx = if_undefined(dx, 1);
        this.dy = if_undefined(dy, this.dx);
        this.n_rows = u.length;
        this.n_cols = u[0].length;

        this.wet_cells = [];
        for (let j = 0; j < this.n_rows; j++) {
            for (let i = 0; i < this.n_cols; i++) {
                if (!(typeof this.u[j][i] === 'number' && typeof this.v[j][i] === 'number'))
                    continue;
                this.wet_cells.push([i, j]);
            }
        }
    }

    randomPoint() {
        let [i, j] = this.wet_cells[Math.floor(Math.random() * this.wet_cells.length)];
        return [this.dx * (i + Math.random()), this.dy * (j + Math.random())];
    }

    outOfBounds(i, j) {
        i = Math.floor(i / this.dx);
        j = Math.floor(j / this.dy);
        return i < 0 || i >= this.n_cols || j < 0 || j >= this.n_rows || 
            this.u[j][i] === "nan" || this.v[j][i] === "nan" || 
            this.u[j][i] === undefined || this.v[j][i] === undefined;
    }

    getFlow(x, y) {
        x = Math.floor(x / this.dx);
        y = Math.floor(y / this.dy);
        return [bilinear(x, y, this.u), bilinear(x, y, this.v)];
    }

    drawWetCells(cx, x_s, y_s, color_palette) {
        if (color_palette === undefined) {
            const black = 50;
            cx.fillStyle = `rgba(${black}, ${black}, ${black}, 1)`;
        }

        for (let k = 0; k < this.wet_cells.length; k++) {
            const [i, j] = this.wet_cells[k];
            const x = x_s + i * this.dx;
            const y = y_s + j * this.dy;

            if (color_palette !== undefined) {
                const [u, v] = this.getFlow(i, j);
                const speed = Math.pow(u**2 + v**2, 0.5);
                const [r, g, b] = color_palette(speed);
                cx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            }
            
            cx.fillRect(x, y, this.dx, this.dy);
        }
    }
}

class Particle {
    constructor(x, y, age, field) {
        this.xy_history = [[x, y]];
        this.age = age;
        this.field = field;
    }

    static newRandom(field) {
        const p = new Particle(0, 0, 0, field);
        p.resetRandom();
        return p;
    }

    resetRandom() {
        this.xy_history = [this.field.randomPoint()];
        this.age = Math.floor(Math.random() * (this.max_age - 10));
    }

    needsReset() {
        let [i, j] = this.xy_history[this.xy_history.length - 1];
        return this.age > this.max_age || this.field.outOfBounds(i, j);
    }

    getFlow() {
        let [x, y] = this.xy_history[this.xy_history.length - 1];
        return this.field.getFlow(x, y);
    }
    
    draw(context, x_s, y_s) {
        // Draws the particle using a canvas context
        // Arguments:
        //   context: the canvas context to draw on
        //   x_s (optional, default is 0): offset x coordinate
        //   y_s (optional, default is 0): offset y coordinate
        x_s = if_undefined(x_s, 0);
        y_s = if_undefined(y_s, 0);
        context.strokeStyle = "rgba(255, 255, 255, 0.4)";

        let x = (i) => x_s + i;
        let y = (j) => y_s + j;

        let [i, j] = this.xy_history[this.xy_history.length - 1];
        context.beginPath();
        context.moveTo(x(i), y(j));

        let start_idx = this.xy_history.length - 2;
        let end_idx = this.xy_history.length - 1 - this.max_history;
        end_idx = Math.max(0, end_idx);

        for (let k = start_idx; k > end_idx; k--) {
            [i, j] = this.xy_history[k];
            context.lineTo(x(i), y(j));
        }
        context.stroke();
    }
    
    move() {
        if (this.needsReset())
            this.resetRandom();
        let [u, v] = this.getFlow();
        let [i, j] = this.xy_history[this.xy_history.length - 1];
        this.xy_history.push([i + u * this.speed_scale, j + v * this.speed_scale]);
        this.age += 1;
    }
}
Particle.prototype.max_age = 50;
Particle.prototype.max_history = 8;
Particle.prototype.speed_scale = 4;

export { Particle, VectorField };