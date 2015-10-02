# Hubot pomodoro script

Hubot script that allows you to start and stop pomodoro sessions and notify when it's over.

Usage
-----
```sh
npm install --save hubot-pomodoro
```

Open `external-scripts.json` and enable the module, by putting it's name into it:

```javascript
["your-other", "external-script", "hubot-pomodoro"]
```

## Commands

* `start pomodoro` - start a new pomodoro
* `start pomodoro <time>` - start a new pomodoro with a duration of <time> minutes
* `stop pomodoro` - stop a pomodoro
* `pomodoro?` - shows the details of the current pomodoro
* `all pomodoros?` - shows the details of all of the running pomodoros
