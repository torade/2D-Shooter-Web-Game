let game

const gameOptions = {
    dudeGravity: 980,
    dudeSpeed: 300
}

window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: '#FAF9F6',
        scale : {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1000,
            height: 800
        },
        pixelArt: true,
        physics: {
            default: "arcade",
            arcade: {
                gravity: {
                    y: 0
                }
            }
        },
        scene: PlayGame
    }

    game = new Phaser.Game(gameConfig);
    window.focus(); 
}

class PlayGame extends Phaser.Scene {
    constructor() {
        super("PlayGame")
        this.score = 0
        this.snowballCount = 0 // Separate counter for snowballs
    }

    preload() {
        this.load.spritesheet('dude', 'assets/dude.png', {frameWidth: 32, frameHeight: 48})
        this.load.image('ground', 'assets/platform.png')
        this.load.image('snow', 'assets/snow.png')
        this.load.image('target', 'assets/target.png')
        this.load.image('bomb', 'assets/bomb.png')
    }

    create() {
        this.ground = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })

        let groundSprite = this.ground.create(500, 750, 'ground').setScale(10, 4);

        this.dude = this.physics.add.sprite(game.config.width / 2, game.config.height / 2, "dude")
        this.dude.body.gravity.y = gameOptions.dudeGravity
        this.physics.add.collider(this.dude, this.ground)

        // Create trajectory line graphics
        this.trajectoryLine = this.add.graphics()
        this.trajectoryLine.lineStyle(2, 0xff0000, 0.8) // Red line, 2px thick, 80% opacity

        // falling snowballs
        this.snowballsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.snowballsGroup, this.collectSnowball, null, this)

        // bombs
        this.bombsGroup = this.physics.add.group({})
        this.physics.add.overlap(this.dude, this.bombsGroup, this.hitByBomb, null, this)

        // player thrown snowballs
        this.thrownSnowballs = this.physics.add.group({})

        // targets
        this.targetsGroup = this.physics.add.group({
            immovable: true,
            allowGravity: false
        })
        
        this.maxTargets = 7
        this.maxBombs = 10
        
        // Create initial targets
        this.createTargets()

        // Collision between thrown snowballs and targets
        this.physics.add.overlap(this.thrownSnowballs, this.targetsGroup, this.hitTarget, null, this)

        // Timer to spawn new targets periodically
        this.targetTimer = this.time.addEvent({
            callback: this.spawnNewTarget,
            callbackScope: this,
            delay: 2000, // Every 2 seconds
            loop: true
        })

        // Timer to spawn bombs periodically
        this.bombTimer = this.time.addEvent({
            callback: this.spawnBomb,
            callbackScope: this,
            delay: 3000, // Every 3 seconds
            loop: true
        })

        this.add.image(20,20,'target').setScale(0.07)
        this.scoreText = this.add.text(40,5,'0 XP', {fontSize: '30px', fill: '#000'})

        // Add snowball count text above player's head
        this.playerScoreText = this.add.text(this.dude.x, this.dude.y - 10, '0', {
            fontSize: '20px', 
            fill: '#000',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5)

        this.cursors = this.input.keyboard.createCursorKeys()
        
        // Add WASD keys
        this.wasd = this.input.keyboard.addKeys('W,S,A,D')
        
        // Add spacebar for shooting
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        
        // Enable mouse input
        this.input.on('pointerdown', this.shootSnowball, this)
        
        this.anims.create({
            key: "left",
            frames: this.anims.generateFrameNumbers("dude", {start: 0, end: 3}),
            frameRate: 10,
            repeat: -1
        })
        this.anims.create({
            key: "turn",
            frames: [{key: "dude", frame: 4}],
            frameRate: 10,
        })

        this.anims.create({
            key: "right",
            frames: this.anims.generateFrameNumbers("dude", {start: 5, end: 9}),
            frameRate: 10,
            repeat: -1
        })

        // timer to spawn snowballs every 1.6 seconds
        this.snowballTimer = this.time.addEvent({
            callback: this.addSnowballs,
            callbackScope: this,
            delay: 600,
            loop: true
        })

        this.facingLeft = false // Initialize facing direction (start facing right)
    }

    addSnowballs() {
        // create snowball at random position in the sky
        let snowball = this.snowballsGroup.create(Phaser.Math.Between(50, game.config.width - 50), Phaser.Math.Between(50, 500), "snow")
        snowball.setScale(0.02) // Make snowballs smaller (30% of original size)
        snowball.body.setVelocity(0, 0) // Start stationary
        snowball.body.setGravityY(0) // No gravity initially
        
        // After 5 seconds, make the snowball fall
        this.time.delayedCall(3000, () => {
            if (snowball && snowball.active) {
                snowball.body.setGravityY(400) // Make it fall
            }
        })
        
        // Remove snowball if it goes off screen
        this.time.delayedCall(15000, () => {
            if (snowball && snowball.active) {
                snowball.destroy()
            }
        })
    }

    collectSnowball(dude, snowball) {
        snowball.disableBody(true, true)
        this.snowballCount += 1; // Increase snowball count
        this.playerScoreText.setText(this.snowballCount); // Update player head text
    }

    createTargets() {
        // Create initial targets up to max limit
        for (let i = 0; i < this.maxTargets; i++) {
            this.spawnNewTarget()
        }
    }

    spawnNewTarget() {
        // Only spawn if under the limit
        if (this.targetsGroup.children.size < this.maxTargets) {
            let x = Phaser.Math.Between(100, game.config.width - 100)
            let y = Phaser.Math.Between(200, 650) // Don't spawn too close to ground or top
            
            let target = this.targetsGroup.create(x, y, 'target').setScale(0.1)
        }
    }

    shootSnowball(pointer) {
        if (this.snowballCount > 0) { // Check snowball count instead of score
            // Create snowball at player position
            let projectile = this.thrownSnowballs.create(this.dude.x, this.dude.y - 20, 'snow')
            projectile.setScale(0.02)
            
            // Calculate direction from player to mouse cursor
            let mouseX, mouseY
            
            if (pointer) {
                // Mouse click - use pointer position
                mouseX = pointer.x
                mouseY = pointer.y
            } else {
                // Spacebar - use current mouse position
                mouseX = this.input.activePointer.x
                mouseY = this.input.activePointer.y
            }
            
            // Calculate angle from player to mouse
            let angle = Phaser.Math.Angle.Between(this.dude.x, this.dude.y, mouseX, mouseY)
            
            // Set velocity based on angle
            let speed = 500
            let velocityX = Math.cos(angle) * speed
            let velocityY = Math.sin(angle) * speed
            
            projectile.body.setVelocity(velocityX, velocityY)
            projectile.body.setGravityY(200) // Slight gravity for arc
            
            // Remove snowball from player's count
            this.snowballCount -= 1
            this.playerScoreText.setText(this.snowballCount)
             
            // Remove projectile after 3 seconds
            this.time.delayedCall(3000, () => {
                if (projectile && projectile.active) {
                    projectile.destroy()
                }
            })
        }
    }

    hitTarget(snowball, target) {
        // Remove the snowball
        snowball.destroy()
        
        // Add 10 points to score for hitting target
        this.score += 10
        this.scoreText.setText(this.score + ' XP')
        
        // Remove the hit target
        target.destroy()
        
        // No need for delayed respawn - the timer will handle new targets
    }

    drawTrajectoryLine() {
        // Clear previous line
        this.trajectoryLine.clear()
        
        // Only draw if player has snowballs
        // if (this.snowballCount > 0) {
            // Get mouse position
            let mouseX = this.input.activePointer.x
            let mouseY = this.input.activePointer.y
            
            // Calculate distance and direction
            let fullDistance = Phaser.Math.Distance.Between(this.dude.x, this.dude.y, mouseX, mouseY)
            let angle = Phaser.Math.Angle.Between(this.dude.x, this.dude.y, mouseX, mouseY)
            
            // Limit line length to 50 pixels
            let maxLength = 100
            let lineLength = Math.min(fullDistance, maxLength)
            
            // Calculate end point of limited line
            let endX = this.dude.x + Math.cos(angle) * lineLength
            let endY = this.dude.y + Math.sin(angle) * lineLength
            
            // Set line style for dotted line
            this.trajectoryLine.lineStyle(2, "#808080", 0.2) // Red, semi-transparent
            
            // Create dotted line effect with limited length
            let segments = Math.floor(lineLength / 10) // Dot every 10 pixels
            let deltaX = (endX - this.dude.x) / segments
            let deltaY = (endY - this.dude.y) / segments
            
            for (let i = 0; i < segments; i += 2) { // Skip every other segment for dotted effect
                let startX = this.dude.x + (deltaX * i)
                let startY = this.dude.y + (deltaY * i)
                let segmentEndX = this.dude.x + (deltaX * (i + 1))
                let segmentEndY = this.dude.y + (deltaY * (i + 1))
                
                this.trajectoryLine.lineBetween(startX, startY, segmentEndX, segmentEndY)
            }
        // }awdw
    }

    update() {
        if (this.wasd.A.isDown) {
            this.dude.body.velocity.x = -gameOptions.dudeSpeed;
            this.dude.anims.play('left', true)
        }
        else if (this.wasd.D.isDown) {
            this.dude.body.velocity.x = gameOptions.dudeSpeed;
            this.dude.anims.play('right', true)
        }
        else {
            this.dude.body.velocity.x = 0;
            this.dude.anims.play('turn', true)
        }

        if (this.wasd.W.isDown && this.dude.body.touching.down) {
            this.dude.body.velocity.y = -gameOptions.dudeGravity / 2;
        }

        // Shoot snowball when space is pressed (using mouse position)
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.shootSnowball()
        }

        // Update player score text position to follow the player
        this.playerScoreText.x = this.dude.x;
        this.playerScoreText.y = this.dude.y - 60;

        // Draw trajectory line to mouse cursor
        this.drawTrajectoryLine()
    }
    
    spawnBomb() {
        // Only spawn if under the limit
        if (this.bombsGroup.children.size < this.maxBombs) {
            let x = Phaser.Math.Between(50, game.config.width - 50)
            let y = Phaser.Math.Between(50, 300) // Spawn in upper part of sky
            
            let bomb = this.bombsGroup.create(x, y, 'bomb')
            bomb.setScale(0.06) // Make bombs much smaller
            bomb.body.setVelocity(0, 0) // Start stationary
            bomb.body.setGravityY(0) // No gravity initially
            
            // After 5 seconds, start shaking for 1 second, then fall
            this.time.delayedCall(5000, () => {
                if (bomb && bomb.active) {
                    this.startBombShaking(bomb)
                }
            })
        }
    }

    startBombShaking(bomb) {
        if (!bomb || !bomb.active) return
        
        // Store original position for shaking effect
        bomb.originalX = bomb.x
        bomb.originalY = bomb.y
        bomb.isShaking = true
        
        // Create shaking effect for 1 second
        bomb.shakeTimer = this.time.addEvent({
            callback: () => {
                if (bomb && bomb.active && bomb.isShaking) {
                    // Random shake within 3 pixels
                    bomb.x = bomb.originalX + Phaser.Math.Between(-3, 3)
                    bomb.y = bomb.originalY + Phaser.Math.Between(-3, 3)
                }
            },
            delay: 50, // Shake every 50ms
            repeat: 20 // For 1 second (20 * 50ms = 1000ms)
        })
        
        // After 1 second of shaking, make it fall
        this.time.delayedCall(1000, () => {
            if (bomb && bomb.active) {
                bomb.isShaking = false
                bomb.x = bomb.originalX // Reset to original position
                bomb.y = bomb.originalY
                bomb.body.setGravityY(800) // Make it fall
            }
        })
        
        // Remove bomb after it falls off screen
        this.time.delayedCall(10000, () => {
            if (bomb && bomb.active) {
                bomb.destroy()
            }
        })
    }

    hitByBomb(dude, bomb) {
        // Handle what happens when player touches a bomb
        bomb.destroy()
        
        // Reduce snowball count as penalty
        this.snowballCount = Math.max(0, this.snowballCount - 2) // Lose 2 snowballs
        this.playerScoreText.setText(this.snowballCount)
        
        console.log("Hit by bomb! Lost 2 snowballs!")
    }
}