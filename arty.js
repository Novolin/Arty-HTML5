/*********************
 * BROWSER ARTILLERY *
 *       V 0.7       *
 *  THE RE-RENDERING *
 ********************/




// page and canvas-related objects
const gameWindow = document.defaultView;
const windowSizeX = gameWindow.innerWidth;
const windowSizeY = gameWindow.innerHeight;
const inputPower = document.getElementById("powerInput");
const inputAngle = document.getElementById("angleInput");
const inputButton = document.getElementById("fireInput");
const canvasContainer = document.getElementById("game"); 
const canvasTarget = document.getElementById("game").getContext("2d", willReadFrequently = true); // the actual 2d canvas object

// game-related objs
const gravity = 1;
let game = false; 
let menu = false;
let gameState = "start"; // are we looking at the start menu, gameplay or game over menu?


// Define our colours as RGB arrays:
const groundColour = [120,255,80];
const playerColour = [250,0,0];
const enemyColour = [0,0,250];
const menuColour = [255,255,255];

// Create values we can pass to the canvas object
const groundColourCSS = `rgba(${groundColour[0]},${groundColour[1]},${groundColour[2]},255)`;
const playerColourCSS = `rgba(${playerColour[0]},${playerColour[1]},${playerColour[2]},255)`;
const enemyColourCSS = `rgba(${enemyColour[0]},${enemyColour[1]},${enemyColour[2]},255)`;
const menuColourCSS = `rgba(${menuColour[0]}, ${menuColour[1]}, ${menuColour[2]}, 255)`;
/**
 * We create RGB arrays for when we're comparing imageData objects in collision detection
 * Because the CSS colours are stored as strings, it's harder to access them.
 */



//Extablish game ticks, event listener.
setInterval(gameTick, 50);


class gameData { //papa object, handles the game and its logic, holding everything nice and neat like
    currentTurn = 0;
    map;
    holes = [];
    things;
    turnOver = false;
    physicsObject = false; // which object should we detect physics on.
    playerCannon;
    enemyCannon;

    constructor(){
        this.map = new gameMap();
        this.playerCannon = this.spawnCannon(true); //force the player into the first "thing" slot
        this.enemyCannon = this.spawnCannon(false);
    }



    /********
     * INPUT *
     ********/

    enableControls(){ //fire upon game/turn start.
        gameWindow.addEventListener("keyup", (fireKeyAction) => {
            if (gameState == "play"){ //only handle these when we're in "game" mode.
                if (fireKeyAction.key == "ArrowUp"){
                    //increase shot angle
                    this.things[0].angle ++;
                } else if (fireKeyAction.key == "ArrowDown"){
                    this.things[0].angle --;
                }
            }
            this.map.draw()
            for (const item in this.things){
                this.things[item].draw();
            }
            
        });
    }

    /*******************
     * Object Spawning *
     ******************/
    spawnCannon(isPlayer){
        let spawnX = 0; //first choose an x position in the first/last 20% of the map
        let mapCheck = this.map.mapPoints;
        if (isPlayer){ 
            spawnX = randint((this.map.sizex * 0.05), (this.map.sizex * 0.2));
        } else {
            spawnX = randint((this.map.sizex * 0.8), (this.map.sizex * 0.95));
        }
        //search for where the ground is at that given x axis:
        let leftPoint = 0;
        let rightPoint = 0;
        let spotSearch = true;
        for (const point in mapCheck){ //find the two points that bracket where it should go
            if (mapCheck[point][0] > spawnX && spotSearch){
                spotSearch = false;
                leftPoint = Number(point) - 1;
                rightPoint = Number(point);
            }
        }
        
        //determine the exact point where we need to put it, starting with the slope
        let cannonSlope = (mapCheck[rightPoint][1] - mapCheck[leftPoint][1])/(mapCheck[rightPoint][0]-mapCheck[leftPoint][0]);
        //now put the cannon's x position on that:
        let spawnY = Math.floor(mapCheck[leftPoint][1] +  ((spawnX - mapCheck[leftPoint][0])* cannonSlope)) - 1;

        if(isPlayer){
            return new cannon(true, spawnX, spawnY, playerColourCSS);
        } else {
            return new cannon(false, spawnX, spawnY, enemyColourCSS);
        }
    }

    spawnBullet(power, angle, positionX, positionY, fromPlayer){
        /* Spawns a bullet, adding it to our list of things. 
        * This also tells the physics code to look at it. */
        this.physicsObject = length(this.things) // Get the index for our next spawned bullet.
        this.things.push(new bullet(power, angle, positionX, positionY, fromPlayer))

    }


    /***********
     * Physics *
     **********/
    physicsTick(){
        /* Run a physics tick on the current physics object. */
        if (this.physicsObject == false){ 
            // just do nothing if there's no active object.
            return false;
        }
        let nextCollide = this.things[physicsObject].checkCollide()
        if (nextCollide){
            // Should be a reference to a specific pixel? idk yet.
            console.log(nextCollide);
            // trigger a turn change
            this.nextTurn();
            // i think my turn change code kinda sucks, tbh? but we'll use it until it breaks
        }
    }

    /**************
     * TURN LOGIC *
     *************/

    nextTurn(){
        switch (this.currentTurn) {
            case 0: //player next, enable input:
                inputButton.disabled = false;
                this.currentTurn++;
                break;
            case 1: //player bullet
                inputButton.disabled = true;
                this.currentTurn++;
                break;
            case 2: //AI
                this.currentTurn++;
                this.enemyCannon.AIGetAim(); //let the AI do its thing
                break;
            default: //AI bullet, but also make any weirdness default to player time.
                this.currentTurn = 0;
                break; 
        }
    }

    /************
     * Graphics *
     ***********/
    draw(){
        /* Draws the current game state to the screen. */
        this.map.draw();
        this.playerCannon.draw();
        this.enemyCannon.draw();
        if (length(this.things) > 0)
            for (var t in things){
                this.things[t].draw()
        }
    }
}


class gameMap { //class that holds map generation/display data
    //Attributes
    sizex;
    sizey;
    mapPoints;
    mapObjects;
    path = new Path2D();
    //Constructor
    constructor(){ 
        this.sizex = 800;
        this.sizey = 600;
        this.mapPoints = this.generateMap();
        this.mapObjects = []; //this will hold things like players, holes, etc. 
    }
    
    generateMap(){
        /* Creates the path2d object which will represent our terrain.
        * returns it as well as saving to this.path
        */
        let noMansLand = [(this.sizex * 0.2), (this.sizex * 0.8)]; //get the borders of the flattening zones
        let finalPoints =[]; //what we'll return
        let checkPoint = 0; //Where we're starting a line (x)
        let getNextX = 0; //Where we're ending this line (x)
        let getNextY = randint(300, this.sizey - 100);

        finalPoints.push([getNextX, getNextY]); //put our first point in that bad boy. Just pick a random Y value.

        //Get the rest of the points:
        while (checkPoint < this.sizex){
            //move forward between 5 and 10 %
            getNextX = checkPoint + randint((this.sizex * 0.05), (this.sizex * 0.1));
            //Choose the direction of travel by a d30
            let angleMult = 0;
            let chooseDirection = randint(0,30);
            //correct for last point altitude
            if (getNextY < (this.sizey * 0.2) - 300){
                chooseDirection -= 10; //if we're way too low, force it to go downwards
            } else if (getNextY < (this.sizey * 0.33) - 300) {
                chooseDirection -= 5; //If we're a bit too high, bias towards going down
            } else if (getNextY + 100 > this.sizey * 0.95){
                chooseDirection += 10; //Don't let it go too low
            } else if (getNextY + 100 > this.sizey * 0.8){ //if we're a bit low, bias towards rising.
                chooseDirection += 5;
            }
            //evaluate results, adjust steepness based on the location of the point:
            if (chooseDirection > 25){
                angleMult = -5; 
            } else if (chooseDirection > 15){
                angleMult = -1; 
            } else if (chooseDirection < 5){
                angleMult = 5 
            } else if (chooseDirection < 12){
                angleMult = 1
            }
        
            //Determine how high to go:
            let yCap = 80; //Put a hard cap for normal areas
            if (getNextX > noMansLand[0] || getNextX < noMansLand[1]){ //if we're creating somewhere that can spawn a player/enemy, we need to lower the cap
                yCap = 0.36397 * (getNextX - checkPoint); //this is for a cap of 20 degs.
            }
            let deltaY = randint(0, yCap);
            getNextY += (angleMult * deltaY); //Multiply the Y change by the multiplier.
            finalPoints.push([getNextX, getNextY]); //Push our pair of coordinates to the array, and set the loop for next round.
            checkPoint = getNextX;
        }
        // add our points to the path 
        this.path.moveTo(800,600);
        this.path.lineTo(0,600)
        for (const p in finalPoints){
            this.path.lineTo(finalPoints[p][0],finalPoints[p][1]);
        }
        this.path.closePath();

        return finalPoints;
    }
    
    draw(){
        /* Draw the map to the canvas object*/
        // Set our colours:
        canvasTarget.fillStyle = groundColourCSS;
        canvasTarget.strokeStyle = groundColourCSS;
        canvasTarget.lineJoin = "round";
        canvasTarget.fill(this.path);
    }

}


/* THIS HERE IS THE GAME OBJECT CLASSES */
class gameObject {
    //Attributes:
    posx;
    posy;
    renderer;
    constructor(posx,posy){
        this.posx = posx;
        this.posy = posy;
    }

    //Methods
    draw(){
        //blank draw method, replace with each instance:    
    }
    physicsTick(){
        //blank again, since most things wont need physics
    }
}

class groundHole extends gameObject { //holes are counted as a type of object, so we can handle drawing them as the screen flips
    //Attributes are inherited
    path = new Path2D();
    radius;
    constructor(posx,posy, radius){
        super(posx, posy);
        this.radius = radius
        this.path.moveTo(posx, posy);
        this.path.arc(this.posx, this.posy, this.radius, 0, 2*Math.PI);
        this.path.closePath();
    }
    //methods
    draw(){ //destroy the ground at this point, by drawing a black circle over it. 
        canvasTarget.fillStyle = "black";
        canvasTarget.strokeStyle = "black";
        canvasTarget.fill(this.path);
    }

}


/* TODO: REWRITE 
*  Make them grow in size and then shrink
* 
*/
class explosion extends gameObject{
        animFrame;
        colour;
        radius;
        constructor(posx,posy, radius){
            super(posx, posy);
            this.radius = radius; 
            this.animFrame = 0;
            this.radius = radius
            
        }
        //methods
        draw(){ // TODO: make this nice.
    
            canvasTarget.fillStyle = this.colour;
            canvasTarget.strokeStyle = this.colour;
            canvasTarget.beginPath();
            canvasTarget.moveTo(this.posx, this.posy);
            canvasTarget.arc(this.posx, this.posy, this.radius, 0, 2* Math.PI);
            canvasTarget.fill();
            canvasTarget.closePath();
        }
        physicsTick(){
            //use this to advance the timers/change colours.
            const expcolours = [`rgb(255,0,0)`, `rgb(255,255,0)`, `rgb(200,128,0)`]
            if (this.animFrame == 0){ //check on the first go if there's a player in the explosion
                //inscribe a square in the circle, roughly:

                let checkSq = this.renderer.getImageData(this.posx - Math.ceil((10 * Math.sqrt(2))/ 2), this.posy - Math.ceil((10 * Math.sqrt(2))/ 2), this.posx + Math.ceil((10 * Math.sqrt(2))/ 2), this.posy + Math.ceil((10 * Math.sqrt(2))/ 2));
                for (let pixdata = 0; pixdata < checkSq.length; pixdata++){
                    if (checkSq[pixdata][0] == 255){
                        //if you see a pixel of cannon in one of these, blow it up
                        game.things[0].alive = false;
                        
                    }
                }
            }
            if (this.animFrame < 20){
                this.animFrame++;
                //change colours eventually, but for now we're just gonna do an orange
                this.colour = expcolours[2];
            } else {
                //make the hole instead.
                game.things.push(new groundHole(this.posx, this.posy));
                this.posx = -100; //GO TO THE SHADOW ZONE
                game.turnOver = true;
            }


            return false;
        }
    
}

class bullet extends gameObject {
    //Attributes
    velx;
    vely;
    terminalVelocity = 50; //cap drop speed
    owner; //did the player fire it?
    //Constructor
    constructor(pow, ang, posx, posy,owner){
        super(Math.floor(posx), Math.floor(posy));
        //math time :(
        this.vely = -Math.sin(getRadians(ang)) * pow;
        this.velx = Math.cos(getRadians(ang)) * pow;
        this.owner = owner; 
    }
    
    checkCollide(){
        /* Checks if the next frame's position will result in a collision.
        *  returns the position of the collision, or false if no collision will occur
        */
       const nextX = Math.floor(this.posx + this.velx);
       const nextY = Math.floor(this.posy + this.vely);
       
       let nextPosition = canvasTarget.getImageData(nextX, nextY, 1, 1)

    }



    physicsTick(){ //Find where it will be on the next game tick, how fast, etc.
        const nextX = Math.floor(this.posx + this.velx);
        const nextY = Math.floor(this.posy + this.vely);

        //check pixels in a line until the landing position
        const slope = this.vely/this.velx;

        //DEBUG: DRAW BEFORE WE CHECK
        this.draw();

        for (let checkX = this.posx; checkX <= nextX; checkX++){
            const checkY = this.posy + Math.floor((checkX - this.posx) * slope);
            checkX = Math.floor(checkX)
            const targetBox = canvasTarget.getImageData(checkX, checkY,1,1);
            const targetData = targetBox.data;
            console.log(targetBox) // TEMP: SO I KNOW IF ICAN JUST LOOK FR COLLRRR
            if (targetData[1] == 255) { //if we hit ground, set the detection point as where we did
                this.posx = checkX;
                this.posy = checkY;
                if (!this.owner){
                    game.things[1].lastImpact = [nextX, nextY];
                    
                }
                return true;
            } else if (targetData == undefined){
                return true
            }
        } 
        if (this.velx < 0){
            for (let checkX = this.posx; checkX >= nextX; checkX--){
                const checkY = this.posy - Math.floor((checkX - this.posx) * slope);
                const targetBox = canvasTarget.getImageData(checkX, checkY,1,1);
                const targetData = targetBox.data;
                console.log(targetBox)
                if (targetData[1] == 255) { 
                    // If we hit ground, put the point at the ground/sky transition.

                    this.posx = checkX;
                    this.posy = checkY;
                    if (!this.owner){
                        game.things[1].lastImpact = [nextX, nextY];
                        console.log(checkX, checkY)
                    }
                    return true;
                } 
            } 
            
        } 
        if (nextX > 800 || nextX < 0 || nextY > 600){ //if we go out of bounds, send the object to the shadow realm. 
            if (!this.owner){
                game.things[1].lastImpact = [nextX, nextY];
            }
            this.posx = -100
            this.posy = -100
            game.turnOver = true; //end the turn
            return true; 
        }
        this.posx = nextX;
        this.posy = nextY;
        
        //recalculate velocity, using gravity and wind (tbd)
        this.vely += gravity;
        if (this.vely > this.terminalVelocity){
            this.vely = this.terminalVelocity;
        }

        return false;

    }

    draw(){
        canvasTarget.fillStyle = `rgb(200,200,0)`;
        canvasTarget.fillRect(this.posx, this.posy, 4,4) //make a circle later
    }
    
}


class cannon extends gameObject {
    //attributes
    colour;
    isPlayer;
    angle;
    power;
    alive;
    lastAng = 0;
    lastPow = 0;
    lastImpact = [0,0];
    nextAngleSet = false;
    //constructor
    constructor(isPlayer, posx, posy, colour){ 
        super(posx, posy);
        this.isPlayer = isPlayer;
        this.collide = true;
        this.alive = true;
        this.colour = colour;
        this.angle = 90;
        this.power = 0;
        
        //set the current position as where the last shot hit, so the ai doesn't get weird. It's technically correct?
        this.lastImpact = [0,0]
        if (!isPlayer){
            this.angle = 135;
            this.power = 25;
        }
    } 
    //methods
    fire(){
        this.lastAng = this.angle;
        this.lastPow = this.power;
        if (this.isPlayer){
            game.spawnBullet(this.power, this.angle, (this.posx + (20 * Math.cos(getRadians(this.angle)))), (this.posy - (20 * Math.sin(getRadians(this.angle)))),this.isPlayer);
        } else {
            game.spawnBullet(this.power, this.angle, (this.posx + (20 * Math.cos(getRadians(this.angle)))), (this.posy - (20 * Math.sin(getRadians(this.angle)))),this.isPlayer);
        }
    }

    draw(){ //draw the cannon on the screen
        if (this.alive){
            canvasTarget.fillStyle = this.colour;
            canvasTarget.strokeStyle = this.colour;
            canvasTarget.lineWidth = 1;
            canvasTarget.beginPath();
            canvasTarget.moveTo(this.posx, this.posy);
            canvasTarget.arc(this.posx, this.posy, 10,Math.PI,3.14);
            canvasTarget.fill();
            canvasTarget.closePath();
            canvasTarget.lineWidth = "4";
            canvasTarget.beginPath();
            canvasTarget.moveTo(this.posx, this.posy - 5);
            //calculate where the line should go:
            let drawAngle = getRadians(-this.angle);
            let barrelX = (this.posx + (20 * Math.cos(drawAngle))); //first number is barrel length
            let barrelY = (this.posy + (20 * Math.sin(drawAngle)));
            canvasTarget.lineTo(barrelX,barrelY); //draw a little line for the barrel
            canvasTarget.stroke();
        }
    }
    AIGetAim(){
        //set the power and angle for the AI, and show on screen:
        if (game.currentTurn == 2 && this.nextAngleSet == false){ //only run when it's the AI's turn:
            let luckCheck = randint(0,10);
            //compare shot impact to player position:
            const shotDelta = [(game.things[0].posx - this.lastImpact[0]),(game.things[0].posy - this.lastImpact[1])];
            let tooLow = true; //vars to determine how to adjust
            let tooShort = true;
            if (shotDelta[0] > 0){ //check if we are short or long
                tooShort = false;
            }
            if (shotDelta[1] < 0){ //check if we're high or low, remember that we render top to bottom!
                tooLow = false;
            }
            //now determine adjustments
            let newAngle = this.angle;
            let newPower = this.power;
            let coinToss = [5,10];
            if (tooLow && tooShort){ 
                //we're short and below, both angle and power are likely low, boost em
                newPower += Math.floor(randint(coinToss[0], coinToss[1])/2) * luckCheck; // guess at how much juice
                if (newAngle < 95){ //don't boost the angle if we're too close to vertical.
                    newAngle -= Math.floor(randint(coinToss[0],coinToss[1]) * luckCheck / 5);
                } 
            } else if (tooLow && !tooShort){
                //if we're below and past the target, we can drop power or  change the angle

                //check if we're above the target:
                if (game.things[0].posy < this.posy){
                    //if we are, prefer lowering power
                    coinToss[1] += 5; 
                }
                if (randint(coinToss[0], coinToss[1]) >= 8){ //if we get over an 8, prefer changing power
                    newPower -= Math.floor(randint(5,10));
                } else { //Otherwise change the angle.
                    if (newAngle - 45 > 90){ //if we're closer to flat, prefer going up, unless...
                        if (coinToss[1] < 11){ 
                            /*if we're above the target, we want to try going lower
                            coinToss will be higher than 10, so we'll prefer power changes*/
                            if (newPower > 5){
                                newPower -= Math.floor(randint(5,10) * luckCheck);
                            } else { //if we're already at the bottom of the power scale, move the angle up
                                newAngle += Math.floor(randint(coinToss[0], coinToss[1]) * luckCheck /2);
                            }
                            
                        } else {
                            newAngle += Math.floor(randint(coinToss[0], coinToss[1]) * luckCheck);
                            if (luckCheck > 8){ //if we have a high luck check, we can change the power too
                                newPower -= Math.floor(randint(2,5) * luckCheck/2);
                            }
                        }
                    } else { //we are closer to vertical. Adjust verticality.
                        if (luckCheck > 5){
                            newAngle -= Math.floor(randint(coinToss[0], coinToss[1]) * luckCheck /2);
                            newPower -= Math.floor(randint(coinToss[0], coinToss[1]) * luckCheck /9); //just little a power, as a treat
                        } else { // or prefer to lower power 
                            newPower -= Math.floor(randint(coinToss[0], coinToss[1]) * luckCheck /2);
                            newAngle -= Math.floor(randint(coinToss[0], coinToss[1]) * luckCheck /9);
                        }

                    }

                }

            } else if (!tooLow && tooShort){
                //we're above and short, so something is likely in our way, either a cliff or a mountain
                if (luckCheck > 5){ //try boosting power
                    newPower += Math.floor(randint(5,10) * luckCheck /2);
                } else { //or raise the angle
                    newAngle -= Math.floor(randint(5,10) * luckCheck /2);
                }
            } else { //now we're high and above, just lower the juice
                newPower -= Math.floor(randint(5,10) * luckCheck /2);
            }
            if (newAngle <= 92){
                newAngle = 92;//cap the vertical position, if needed
            }else if (newAngle > 170) { //in the other direction, too.
                newAngle = 170;
            }
            if (newPower > 25){
                newPower = 25; //cap power, too.
            } else if (newPower <= 5){
                newPower = 5;
                if (luckCheck > 8){ //randomly decide to just yeet.
                    newPower = 10;
                    newAngle = 135;
                }
            }
            this.lastAng = newAngle; //use the previous angle/power vars as our targets
            this.lastPow = newPower;
            this.nextAngleSet = true;
        }
        //add a delay/animation to smooth over the changes, and make it seem like the cpu is thinking
        else if (game.currentTurn == 2 && this.nextAngleSet == true){
        // check if we're matched with target angle, otherwise work our way towards it.
            if (this.lastAng == this.angle && this.lastPow == this.power){
                this.nextAngleSet = false; //reset the angle check
                this.fire();
            } else {
                if (this.lastAng > this.angle){ //angle adjustment
                    this.angle += 1;
                } else if (this.lastAng < this.angle){
                    this.angle -= 1;
                } else if (this.lastPow > this.power){ //adjust power
                    this.power += 1;
                } else if (this.lastPow < this.power){
                    this.power -= 1;
                }
            }
        }
        
    } 

    playerGetAim(){
        this.angle = inputAngle.valueAsNumber;
        this.power = 5 + inputPower.valueAsNumber/4;
    }
}
//Menu/UI things:
class gameMenu {
    items = [];
    title_text;
    visible = true;
    font = "64px monospace";
    refreshNeeded = true;
    constructor(title){
        this.title_text = title;
        this.items.push(new menuItem(250, 300, 200,150, "PLAY"));
    }

    draw(){
        // Draw menu and its children
        canvasTarget.fillStyle = menuColourCSS;
        canvasTarget.font = this.font;
        canvasTarget.textAlign = "center";
        canvasTarget.fillText(this.title_text, 400, 150);
        for (const key in this.items) { // Draw each button
            this.items[key].draw();
        }
    }

    draw_if_needed(){
        if (this.refreshNeeded){
            this.draw();
            this.refreshNeeded = false;
        }
    }

    
}
class menuItem {
    //positional data:
    posx;
    posy;
    rectx;
    recty;
    //Text:
    label;
    font = "48px monospace";
    //appearance/interaction
    hover;
    colour;
    clicked;
    clickAction = "none"


    //methods:
    constructor(posx, posy, rectx, recty, label, border = 5){
        this.posx = posx;
        this.posy = posy;
        this.rectx = rectx;
        this.recty = recty;
        this.label = label;
        this.border = border;
        this.label_x = (this.posx + this.rectx) / 2;
    }

    draw(){
        //Place the item on the screen
        canvasTarget.strokeStyle = menuColourCSS;
        canvasTarget.strokeRect(this.posx, this.posy, this.rectx, this.recty)
        canvasTarget.font = this.font
        canvasTarget.fillText(this.label, this.posx + (this.rectx / 2), this.posy + (this.recty / 2))
    }
    checkCollide(pointX, pointY){
        /* checks if a point collides with a rectangle with origin (rectX, rectY)*/
        if (pointX < this.posx | pointX > this.posx + this.rectx){
            return false;
        } else if (pointY < this.posy | pointY > this.posy + this.recty){
            return false;
        } else {
            return true;
        }
    }

    onClick(){
        //do whatever you need to
    }


}
/************
* FUNCTIONS *
************/
//Math:
function randint(min, max){
    return (min + Math.floor((Math.random() * (max - min))));
}

function getRadians(angle){
    return angle * (Math.PI / 180);
}
// Collision: 
function checkCollideCircle(pointX, pointY, circleX, circleY, radius){
    /* 
    Checks if a point at (pointX, pointY) falls within a circle of radius at (circleX, circleY)
    */
    let distanceX = Math.abs(circleX - pointX);
    let distanceY = Math.abs(circleY - pointY);
    if (distanceX > radius | distanceY > radius) {
        return false;
    }
    if (Math.sqrt((distanceX ** 2) + (distanceY ** 2)) > radius){
        return false;
    } else {
        return true;
    }
}


//game setup:

function gameStart(){
    game = new gameData();
    gameState = "play";
    menu = undefined; // disable the menu
}

function gameTick(){
    //execute a logic tick

    if (gameState == "start"){ // we are on the "new game" menu
        if (menu == undefined) {
            console.log("GAME STATE NOT SET AND MENU NOT DEFINED!")
            gameState = "error";
        }
        menu.draw_if_needed();
    } else if (gameState == "error"){
        return;
    }

    if (game == undefined){
        return;
    }
    if (game){
        // Blank the screen:
        canvasTarget.fillStyle = "black";
        canvasTarget.fillRect(0,0,800,600);
        //purge anything in the shadow realm:
        game.things = game.things.filter((thing) => thing.posx > 0)

        //await AI animations
        if (game.currentTurn == 2){
            game.things[1].AIGetAim(); //will set turnOver if it leads to firing
        }

        //update the player cannon angle
        game.things[0].playerGetAim();


        //Render and collision detection
        game.map.draw();
        for (let i = 0; i < game.things.length; i++){
            if (game.things[i].physicsTick()){ //if we collide, replace it with a hole.
                let nextPos = [game.things[i].posx, game.things[i].posy];
                game.things[i] = new explosion(nextPos[0], nextPos[1], 0);
                game.things[i].physicsTick(); //give it a physics tick just to make it work and do collision stuff
                
            }
            game.things[i].draw();
        }

    }
}
function playerFire(){
    if (game.currentTurn == 0){ //make sure it's the player's turn.
        game.things[0].fire();
    }
}
function showStartMenu(){
    menu = new gameMenu("BROWSER ARTILLERY", canvasTarget);
    menu.draw();
    addEventListener("mouseup", mouseClicked);
}
function mouseClicked(e){
    /* handles clickable stuff */
    if (menu && e.button == 0){
        // for now just output to console because fffff
        for (const key in menu.items) {
            if (menu.items[key].checkCollide(e.offsetX, e.offsetY)){
                // TODO: make this properly check for window scaling.
                gameStart();
                
            }
        }
    }
}

function mouseMoved(e){ // Handle highlighting/unhighlighting the play button.
    /* TODO */

}



inputButton.addEventListener("click", playerFire);


// show the menu on game start
document.onload = showStartMenu();