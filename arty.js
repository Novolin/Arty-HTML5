/*********************
 * BROWSER ARTILLERY *
 *      V 0.6.1      *
 *    NOW WITH AI!   *
 ********************/




//Variables and Constants:
const gravity = 1;
const gameWindow = document.defaultView;
const windowSizeX = gameWindow.innerWidth;
const windowSizeY = gameWindow.innerHeight;
const inputPower = document.getElementById("powerInput");
const inputAngle = document.getElementById("angleInput");
const inputButton = document.getElementById("fireInput");
let game; 
let menu;

// Set colours
const colour_green = `rgb(120,255,80)`;
const colour_red = `rgb(250,0,0)`;
const colour_blue = `rgb(0,0,250)`;



//Extablish game ticks, event listener.
setInterval(gameTick, 50);

/*****************************************************************************
 * WELCOME TO CLASS TOWN
 * RIGHT HERE WE GOT US OUR MAIN DATA CLASSES YOURS FOR ONLY A FEW KB OF RAM
 * OBJECT ORIENTED PROGRAMMING YEEEEEEEEE HAAAAAAAW
 ****************************************************************************/

class gameData { //papa object, handles the game and its logic, holding everything nice and neat like
    currentTurn;
    gameState;
    render;
    map;
    things;
    nextTurn;
    turnOver;

    constructor(){
        this.gameState = "game"; //are win in a game or menu
        this.currentTurn = 0; //Which turn is going on
        this.map = new gameMap();
        this.render = new gameRender();
        this.things = [null, null] //this is an array of all the objects that need to be placed on the map, like players, etc.
        this.things[0] = this.spawnCannon(true); //force the player into the first "thing" slot
        this.things[1] = this.spawnCannon(false);
        this.nextTurn = 1; //what turn will go next.
        this.turnOver = false; //flag if the turn is ready to change.
        //for now, just render the map on construction:
        this.render.drawGeography(this.map.sizex, this.map.sizey, this.map.mapPoints);
        for (const item in this.things){
            this.things[item].draw(this.render.cvx);
        }
    }

    //Methods

    /********
     * INPUT
     ********/

    enableControls(){ //fire upon game/turn start.
        gameWindow.addEventListener("keyup", (fireKeyAction) => {
            if (this.gameState == "game"){ //only handle these when we're in "game" mode.
                if (fireKeyAction.key == "ArrowUp"){
                    //increase shot angle
                    this.things[0].angle ++;
                } else if (fireKeyAction.key == "ArrowDown"){
                    this.things[0].angle --;
                }
            }
            this.render.drawGeography(this.map.sizex, this.map.sizey, this.map.mapPoints);
            for (const item in this.things){
                this.things[item].draw(this.render.cvx);
            }
            
        });

    /*****************
     * GAME STARTING *
     ****************/
    }

    drawMap(){
        this.render.drawGeography(this.map.sizex, this.map.sizey, this.map.mapPoints);
    }

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
            return new cannon(true, spawnX, spawnY, "red");
        } else {
            return new cannon(false, spawnX, spawnY, "blue");
        }
        

    }

    
}


class gameRender { //this class handles all of the rendering functions for the game.
    canvas;
    showMap;
    showMenu;
    visibleObjects;
    constructor(){
        this.canvas = document.getElementById("game").getContext("2d", {willReadFrequently:true});
    }

    drawGeography(sizex, sizey, geoData) {
        //Wipe existing screen data:
        this.canvas.fillStyle = "black";
        this.canvas.fillRect(0,0,sizex, sizey);

        //draw the geography as a trace:
        this.canvas.fillStyle = colour_green;
        this.canvas.strokeStyle = colour_green;
        this.canvas.beginPath();
        this.canvas.moveTo(geoData[0][0], geoData[0][1]);
        let pointCount = 1;
        while (pointCount < geoData.length){
            this.canvas.lineTo(geoData[pointCount][0],geoData[pointCount][1]);
            pointCount ++;
        }
        //After drawing the contours, fill the ground:
        this.canvas.lineTo(sizex, sizey);
        this.canvas.lineTo(0,sizey);
        this.canvas.lineTo(geoData[0][0], geoData[0][1]);
        this.canvas.fill(); 
    }

    drawObjs(){
        // Draws every object in our
        for (const key in this.visibleObjects) {
            key.draw() // Each object should have its own draw call which points to the canvas object
        }
    }
}

class gameMap { //class that holds map generation/display data
    //Attributes
    sizex;
    sizey;
    mapPoints;
    mapObjects;
    //Constructor
    constructor(){ 
        this.sizex = 800;
        this.sizey = 600;
        this.mapPoints = this.generateMap();
        this.mapObjects = []; //this will hold things like players, holes, etc. 
    }
    //Methods
    generateMap(){ //returns a list of points that the map can interpolate to generate itself
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
        return finalPoints;
    }
    
}


/* THIS HERE IS THE GAME OBJECT CLASSES */
class gameObject {
    //Attributes:
    posx;
    posy;
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

    constructor(posx,posy){
        super(posx, posy);
    }
    //methods
    draw(){ //destroy the ground at this point, replacing the sprite and removing collision.

        game.render.cvx.fillStyle = "black";
        game.render.cvx.strokeStyle = "black";
        game.render.cvx.beginPath();
        game.render.cvx.moveTo(this.posx, this.posy);
        game.render.cvx.arc(this.posx, this.posy, 15, 3.14, 3.139);
        game.render.cvx.fill();
        game.render.cvx.closePath();
    }

}

class explosion extends gameObject{
        animFrame;
        colour;
        constructor(posx,posy, radius){
            super(posx, posy);
            this.radius = radius; //do some shit about make the circle i guess
            this.animFrame = 0;
        }
        //methods
        draw(){ //do a flashy flashy :)
    
            game.render.cvx.fillStyle = this.colour;
            game.render.cvx.strokeStyle = this.colour;
            game.render.cvx.beginPath();
            game.render.cvx.moveTo(this.posx, this.posy);
            game.render.cvx.arc(this.posx, this.posy, 15, 3.14, 3.139);
            game.render.cvx.fill();
            game.render.cvx.closePath();
        }
        physicsTick(){
            //use this to advance the timers/change colours.
            const expcolours = [`rgb(255,0,0)`, `rgb(255,255,0)`, `rgb(200,128,0)`]
            if (this.animFrame == 0){ //check on the first go if there's a player in the explosion
                //inscribe a square in the circle, roughly:

                let checkSq = game.render.cvx.getImageData(this.posx - Math.ceil((10 * Math.sqrt(2))/ 2), this.posy - Math.ceil((10 * Math.sqrt(2))/ 2), this.posx + Math.ceil((10 * Math.sqrt(2))/ 2), this.posy + Math.ceil((10 * Math.sqrt(2))/ 2));
                for (let pixdata = 0; pixdata < checkSq.length; pixdata++){
                    if (checkSq[pixdata][0] == 255){
                        //if you see a pixel of cannon in one of these, blow it up
                        game.things[0].alive = false;
                        //play some kind of 
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
    //Methods
    physicsTick(){ //Find where it will be on the next game tick, how fast, etc.
        const nextX = Math.floor(this.posx + this.velx);
        const nextY = Math.floor(this.posy + this.vely);

        //check pixels in a line until the landing position
        const slope = this.vely/this.velx;
        for (let checkX = this.posx; checkX <= nextX; checkX++){
            const checkY = this.posy + Math.floor((checkX - this.posx) * slope);
            checkX = Math.floor(checkX)
            const targetBox = game.render.cvx.getImageData(checkX, checkY,1,1);
            const targetData = targetBox.data;
            if (targetData[1] == 255) { //if we hit ground, set the detection point as where we did
                this.posx = checkX;
                this.posy = checkY;
                if (!this.owner){
                    game.things[1].lastImpact = [nextX, nextY];
                    
                }
                return true;
            } 
        } 
        if (this.velx < 0){
            for (let checkX = this.posx; checkX >= nextX; checkX--){
                const checkY = this.posy - Math.floor((checkX - this.posx) * slope);
                const targetBox = game.render.cvx.getImageData(checkX, checkY,1,1);
                const targetData = targetBox.data;
                
                if (targetData[1] == 255) { //if we hit ground, set the detection point as where we did
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

    draw(renderer){
        renderer.fillStyle = `rgb(200,200,0)`;
        renderer.fillRect(this.posx, this.posy, 4,4) //make a circle later
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
            game.things.push(new bullet(this.power, this.angle, (this.posx + (20 * Math.cos(getRadians(this.angle)))), (this.posy - (20 * Math.sin(getRadians(this.angle)))),this.isPlayer));
        } else {
            game.things.push(new bullet(this.power, this.angle, (this.posx + (20 * Math.cos(getRadians(this.angle)))), (this.posy - (20 * Math.sin(getRadians(this.angle)))),this.isPlayer));
        }
        
        game.turnOver = true; //flag the turn as finished
    }

    draw(renderer){ //draw the cannon on the screen
        if (this.alive){
            renderer.fillStyle = this.colour;
            renderer.strokeStyle = this.colour;
            renderer.lineWidth = 1;
            renderer.beginPath();
            renderer.moveTo(this.posx, this.posy);
            renderer.arc(this.posx, this.posy, 10,Math.PI,3.14);
            renderer.fill();
            renderer.closePath();
            renderer.lineWidth = "4";
            renderer.beginPath();
            renderer.moveTo(this.posx, this.posy - 5);
            //calculate where the line should go:
            let drawAngle = getRadians(-this.angle);
            let barrelX = (this.posx + (20 * Math.cos(drawAngle))); //first number is barrel length
            let barrelY = (this.posy + (20 * Math.sin(drawAngle)));
            renderer.lineTo(barrelX,barrelY); //draw a little line for the barrel
            renderer.stroke();
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
    constructor(title, render_target){
        this.title_text = title;
        this.renderer = render_target;
        this.items.push(new menuItem(400, 300, 100,100, "New Game"));
    }

    draw(){
        // Draw menu and its children
        this.renderer.font = this.font;
        this.renderer.textAlign = "center";
        this.renderer.fillText(title_text, 400, 80);
        for (const key in this.items) { // Draw each button
            key.draw();
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
    font = "24px monospace";
    //appearance/interaction
    hover;
    colour;
    clicked;
    canvas = game.render.cvx; 

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
        this.canvas.rect(this.posx, this.posy, this.rectx, this.recty)

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

function isInCircle(pointX, pointY, circleX, circleY, radius){
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

function nextTurn(){
    switch (game.nextTurn) {
        case 0: //player next, enable input:
            inputButton.disabled = false;
            game.currentTurn = game.nextTurn;
            game.nextTurn = 1;
            break;
        case 1: //player bullet
            inputButton.disabled = true;
            game.currentTurn = game.nextTurn;
            game.nextTurn = 2;
            break;
        case 2: //AI
            game.currentTurn = game.nextTurn;
            game.nextTurn = 3;
            game.things[1].AIGetAim(); //let the AI do its thing
            break;
        default: //AI bullet, but also make any weirdness default to player time.
            game.currentTurn = game.nextTurn;
            game.nextTurn = 0;
            break; 
    }

}

//game setup:

function gameStart(){
    game = new gameData();
}

function gameTick(){
    //execute a logic tick
    if (game.gameState = "game"){
        //purge anything in the shadow realm:
        game.things = game.things.filter((thing) => thing.posx > 0)

        //await AI animations
        if (game.currentTurn == 2){
            game.things[1].AIGetAim(); //will set turnOver if it leads to firing
        }

        if (game.turnOver){ //trigger a turn change on this frame.
            game.turnOver = false;
            nextTurn();
        }
        //update the player cannon angle
        game.things[0].playerGetAim();


        //Render and collision detection
        game.drawMap();
        for (let i = 0; i < game.things.length; i++){
            if (game.things[i].physicsTick()){ //if we collide, replace it with a hole.
                let nextPos = [game.things[i].posx, game.things[i].posy];
                game.things[i] = new explosion(nextPos[0], nextPos[1], 0);
                game.things[i].physicsTick(); //give it a physics tick just to make it work and do collision stuff
                
            }
            game.things[i].draw(game.render.cvx);
        }

    } else if (game.gameState = "start"){
        //todo: draw main menu
    }
}
function playerFire(){
    if (game.currentTurn == 0){ //make sure it's the player's turn.
        game.things[0].fire();
    }
}
function showStartMenu(){
    menu = new gameMenu("BROWSER ARTILLERY", document.getElementById("game").getContext("2d"));
}


inputButton.addEventListener("click", playerFire)
//fire the loading script on game start.
document.onload = showStartMenu();