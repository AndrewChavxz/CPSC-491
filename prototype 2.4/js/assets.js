window.App = window.App || {};

/**
 * assets.js
 * 
 * This file handles loading the game's images (trees, rocks, buildings, characters)
 * and provides the functions to draw them onto the HTML canvas.
 */
(function () {
    // -------------------- Image Loading --------------------

    const treeOakImg = new Image();
    treeOakImg.src = "images/oak_tree.png";

    const treePineImg = new Image();
    treePineImg.src = "images/Pine_Tree.png";

    const rock2Img = new Image();
    rock2Img.src = "images/rock_2.png";

    const rock3Img = new Image();
    rock3Img.src = "images/rock_3.png";

    const cabinImg = new Image();
    cabinImg.src = "images/cabin.png";

    const house1Img = new Image();
    house1Img.src = "images/house_1.png";

    const house2Img = new Image();
    house2Img.src = "images/house_2.png";

    const house3Img = new Image();
    house3Img.src = "images/house_4.png";

    const redRobotImg = new Image();
    redRobotImg.src = "images/red_robot.png";
    const blueRobotImg = new Image();
    blueRobotImg.src = "images/blue_robot.png";
    const greenRobotImg = new Image();
    greenRobotImg.src = "images/green_robot.png";
    const yellowRobotImg = new Image();
    yellowRobotImg.src = "images/yellow_robot.png";

    const redFlippedImg = new Image();
    redFlippedImg.src = "images/red_flipped.png";
    const blueFlippedImg = new Image();
    blueFlippedImg.src = "images/blue_flipped.png";
    const greenFlippedImg = new Image();
    greenFlippedImg.src = "images/green_flipped.png";
    const yellowFlippedImg = new Image();
    yellowFlippedImg.src = "images/yellow_flipped.png";


    // -------------------- Drawing Functions --------------------

    /**
     * Helper function to draw a polygon shape (like a tile or its shadow).
     */
    function drawPoly(ctx, points, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let k = 1; k < points.length; k++) {
            ctx.lineTo(points[k].x, points[k].y);
        }
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }

    // Pre-calculated tile colors
    const topColor = "#a6d35c";
    const leftColor = App.shade(topColor, -0.18);
    const rightColor = App.shade(topColor, -0.28);
    const edgeColor = "rgba(20,40,12,0.45)";

    /**
     * Draws a single isometric grid tile, giving it a 3D block appearance.
     */
    function drawBlockTile(ctx, i, j, tileW, tileH, blockH) {
        const p = App.Engine.isoToScreen(i, j);

        // Points for the top face of the tile
        const top = [
            { x: p.x, y: p.y - tileH / 2 },
            { x: p.x + tileW / 2, y: p.y },
            { x: p.x, y: p.y + tileH / 2 },
            { x: p.x - tileW / 2, y: p.y }
        ];
        // Points for the bottom face of the tile (lowered by blockH)
        const down = top.map(pt => ({ x: pt.x, y: pt.y + blockH }));

        // Draw the left and right sides to give it depth
        drawPoly(ctx, [top[3], top[2], down[2], down[3]], leftColor, edgeColor);
        drawPoly(ctx, [top[1], top[2], down[2], down[1]], rightColor, edgeColor);

        // Draw the top face
        drawPoly(ctx, top, topColor, edgeColor);

        // Add a subtle highlight edge
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.beginPath();
        ctx.moveTo(top[0].x, top[0].y);
        ctx.lineTo(top[2].x, top[2].y);
        ctx.stroke();
    }

    /**
     * Draws a building image onto a specific tile coordinate.
     */
    function drawBuilding(ctx, i, j, variant, blockH) {
        const p = App.Engine.isoToScreen(i, j);
        let img;
        let imgWidth = 180;
        let imgHeight = 180;
        let yOffset = 70; // Adjusts how the building sits vertically on the tile

        switch (variant) {
            case 'building_Cabin': img = cabinImg; break;
            case 'building_House 1': img = house1Img; break;
            case 'building_House 2': img = house2Img; break;
            case 'building_House 3': img = house3Img; break;
            default: return; // Stop if it's an unknown building type
        }

        if (!img.complete || img.naturalWidth === 0) return; // Wait until the image finishes loading

        // Draw the image at the correct screen position
        ctx.drawImage(img, p.x - imgWidth / 2, p.y - blockH - imgHeight + yOffset, imgWidth, imgHeight);
    }

    /**
     * Draws a tree (either oak or pine) at a specific tile coordinate.
     */
    function drawTree(ctx, i, j, variant, blockH) {
        const p = App.Engine.isoToScreen(i, j);
        const img = variant === 'tree_oak' ? treeOakImg : treePineImg;

        // Fallback: If image hasn't loaded yet, draw a simple blocky tree shape
        if (!img.complete || img.naturalWidth === 0) {
            const base = { x: p.x, y: p.y };
            ctx.fillStyle = "#8B4513";
            ctx.fillRect(base.x - 4, base.y - 10 - blockH, 8, 20); // Trunk
            ctx.fillStyle = "#228B22";
            ctx.beginPath(); // Leaves
            ctx.moveTo(base.x - 15, base.y - 10 - blockH);
            ctx.lineTo(base.x + 15, base.y - 10 - blockH);
            ctx.lineTo(base.x, base.y - 60 - blockH);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            return;
        }

        const imgWidth = 100;
        const imgHeight = 140;
        // Draw the loaded tree image
        ctx.drawImage(img, p.x - imgWidth / 2, p.y - blockH - imgHeight + 30, imgWidth, imgHeight);
    }

    /**
     * Draws a rock object on the grid.
     */
    function drawRock(ctx, i, j, variant, blockH) {
        const p = App.Engine.isoToScreen(i, j);
        const img = variant === 'rock_2' ? rock2Img : rock3Img;

        // Fallback: If image hasn't loaded, draw a grey circle
        if (!img.complete || img.naturalWidth === 0) {
            ctx.fillStyle = "#808080";
            ctx.beginPath();
            ctx.arc(p.x, p.y - 5 - blockH, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#555";
            ctx.stroke();
            return;
        }

        const imgWidth = 52;
        const imgHeight = 52;
        // Draw the loaded rock image
        ctx.drawImage(img, p.x - imgWidth / 2, p.y - blockH - imgHeight + 20, imgWidth, imgHeight);
    }

    /**
     * Draws a character (robot) on the grid, selecting the correct color and face direction.
     */
    function drawCharacter(ctx, char, activeCharId, blockH) {
        const p = App.Engine.isoToScreen(char.x, char.y);
        const baseY = p.y - blockH - 8;

        // Highlight the character if they are currently the "active" player to move
        if (char.id === activeCharId) {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - blockH + 4, 18, 9, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        let img;
        // Assign a consistent robot color to this character ID using a simple hash scheme
        let hash = 0;
        for (let i = 0; i < char.id.length; i++) {
            hash += char.id.charCodeAt(i);
        }
        const idx = hash % 4;

        // Pick the correct sprite image depending on the color and which way they are facing
        if (idx === 0) img = char.facingRight ? redFlippedImg : redRobotImg;
        else if (idx === 1) img = char.facingRight ? blueFlippedImg : blueRobotImg;
        else if (idx === 2) img = char.facingRight ? greenFlippedImg : greenRobotImg;
        else img = char.facingRight ? yellowFlippedImg : yellowRobotImg;

        if (!img.complete || img.naturalWidth === 0) {
            // Fallback: If the robot image hasn't loaded, draw a basic placeholder shape
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - blockH + 4, 10, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fill();

            App.roundRectPath(ctx, p.x - 8, baseY - 18, 16, 18, 6);
            ctx.fillStyle = char.color;
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(p.x, baseY - 26, 7, 0, Math.PI * 2);
            ctx.fillStyle = "#fff2c8";
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.stroke();

            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath();
            ctx.arc(p.x - 2.5, baseY - 26, 1, 0, Math.PI * 2);
            ctx.arc(p.x + 2.5, baseY - 26, 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw the beautiful robot sprite
            const imgWidth = 75;
            const ratio = img.naturalHeight / img.naturalWidth;
            const imgHeight = imgWidth * ratio;
            const yOffset = 22;

            // Draw a drop shadow underneath the character
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - blockH + 4, 14, 7, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fill();

            // Draw the actual image
            ctx.drawImage(img, p.x - imgWidth / 2, p.y - blockH - imgHeight + yOffset, imgWidth, imgHeight);
        }

        // Draw the character's ID Label above their head
        ctx.fillStyle = "#fff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(char.id, p.x, baseY - 50);
    }

    // Expose these drawing functions to the rest of the application
    App.Assets = {
        drawBlockTile,
        drawBuilding,
        drawTree,
        drawRock,
        drawCharacter
    };
})();
