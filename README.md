# Battleships

#### Online battleships game

Using [websockets](https://pypi.org/project/websockets/) to connect to the client.

[SQLite](https://www.sqlite.org/) database for storing account data and game logs (for players top)

And JS for the client-side

## Installation

1. Use the [pip](https://pip.pypa.io/en/stable/) to install libs from requirements.txt.

```bash
pip install -r requirements.txt
```

2. Fill server/config.py file (if needed)
3. Change IP and PORT in client/script.js file (if needed)

## Usage

#### Server
Launch server:

```bash
python server/main.py
```
#### Client
1. Open index.html from the client folder
2. Create an account and play (you will need a friend)

#### Debug
You can find all errors in log/errors.log file

## Contributing
Pull requests and an issues are welcome!
