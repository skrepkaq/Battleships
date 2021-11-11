from random import randint
from enum import Enum


class Cell(Enum):
    EMPTY = 0
    SHIP = 1
    ERROR = 2
    DEAD = 3
    MISS = 4
    HIT = 5


class Board():
    def __init__(self):
        self.board = [[Cell.EMPTY for _ in range(10)] for _ in range(10)]
        self.ships = [0, 0, 0, 0]

    def place(self, num, state):
        self.board[int(num/10)][num%10] = Cell(state)
        arr_brd = ([[val.value for val in _] for _ in self.board])  # copy board
        for error in self.count_ships():
            # set all cells with errors to 2
            arr_brd[error[1]][error[0]] = 2
        return arr_brd

    def shot(self, num):
        '''
        Shot
        Returns False if it's imposible to shot
        Or board and change_turn=True in case of miss
        '''
        change_turn = False
        x = num % 10
        y = int(num/10)
        brd = self.board
        if brd[y][x] in (Cell.DEAD, Cell.MISS, Cell.HIT): return False
        if brd[y][x] == Cell.EMPTY:
            brd[y][x] = Cell.MISS
            change_turn = True
        else:
            brd[y][x] = Cell.HIT
            self.kill_check(self.board, x, y)
        # copy board but hide alive ships
        return ([[x.value if x != Cell.SHIP else 0 for x in y] for y in brd]), change_turn

    def count_ships(self) -> set:
        '''
        Returns set of cells with errors in placing
        '''
        def check_ship_vertical(x, y):
            # returns True if ship is vertical
            if 0 <= y-1 < 10:
                if self.board[y-1][x] == Cell.SHIP: return True
            if 0 <= y+1 < 10:
                if self.board[y+1][x] == Cell.SHIP: return True
            return False

        def check_ship_end(x, y, swap):
            # checks if next cell is empty or border
            if swap == 1:
                if y == 9: return True
                if self.board[y+1][x] == Cell.EMPTY: return True
                return False
            else:
                if x == 9: return True
                if self.board[y][x+1] == Cell.EMPTY: return True
                return False

        def check_corners(x, y):
            # checks if ships are touching corners
            corners_shift = ((-1, -1),
                             (+1, -1),
                             (-1, +1),
                             (+1, +1))
            for i in range(4):
                dx = x + corners_shift[i][1]
                dy = y + corners_shift[i][0]
                if 0 <= dx < 10 and 0 <= dy < 10:
                    if self.board[dy][dx] == Cell.SHIP: return True
            return False

        self.ships = [0, 0, 0, 0]
        errors = set()  # set of cells with errors
        for swap in range(2):
            # swap 0-count horisontal ships 1-vertical ships
            for py in range(10):
                curr_ship_len = 0
                for px in range(10):
                    x, y = px, py
                    if swap == 1: y, x = px, py  # swap x and y to count vertical ships
                    if self.board[y][x] == Cell.SHIP:
                        curr_ship_len += 1
                        if check_corners(x, y):
                            errors.add((x, y))
                    if curr_ship_len > 0 and check_ship_end(x, y, swap):
                        if curr_ship_len == 1:
                            # ship is single-celled or vertical
                            if swap or check_ship_vertical(x, y):
                                '''
                                Ship is vertical or swap=1
                                Single-celled ships are counted only once, in horsontal mode(swap=0)
                                In either case - ignore ship
                                '''
                                curr_ship_len = 0
                        if 0 < curr_ship_len <= 4:
                            # count ship
                            self.ships[curr_ship_len-1] += 1
                            if self.ships[curr_ship_len-1] > 5-curr_ship_len:
                                # more ships than allowed -> errors
                                for c in range(curr_ship_len):
                                    if swap == 1:
                                        errors.add((x, y-c))
                                    else:
                                        errors.add((x-c, y))
                        elif curr_ship_len > 0:
                            # ship longer than 4 cells -> error
                            errors.add((x, y))
                        curr_ship_len = 0
        return errors

    def kill_check(self, brd, x, y) -> None:
        # checks if shot was lethal to the ship and changes hit to dead
        def check_step(x, y):
            x += shift_map[i][0]
            y += shift_map[i][1]
            if 0 <= x < 10 and 0 <= y < 10:
                cell = brd[y][x]
                if cell == Cell.SHIP:
                    # found alive cell of ship
                    global alive
                    alive = True
                elif cell == Cell.HIT:
                    global last_cords
                    last_cords = [x, y, i]
                    # cell is dead, check next
                    check_step(x, y)

        def miss_step(x, y, i):
            # changes hit to dead
            if 0 <= x < 10 and 0 <= y < 10:
                if brd[y][x] == Cell.HIT:
                    for x_s in range(-1, 2):
                        for y_s in range(-1, 2):
                            # fill area around dead ship with miss
                            pX = x+x_s
                            pY = y+y_s
                            if 0 <= pX < 10 and 0 <= pY < 10:
                                if brd[pY][pX] == Cell.EMPTY: brd[pY][pX] = Cell.MISS
                    brd[y][x] = Cell.DEAD
                    miss_step(x+shift_map[i][0], y+shift_map[i][1], i)

        global alive
        global last_cords
        alive = False
        last_cords = [x, y, 0]
        shift_map = ((0, -1),
                     (0, 1),
                     (1, 0),
                     (-1, 0))
        shift_of_shift_map = (1, 0, 3, 2)
        for i in range(4):
            # check all 4 dirrections
            check_step(x, y)
        if not alive:
            # ship is dead
            # turn around by shift_of_shift_map and change hit to dead
            miss_step(last_cords[0], last_cords[1], shift_of_shift_map[last_cords[2]])

    def auto_place(self):
        self.board = [[Cell.EMPTY for _ in range(10)] for _ in range(10)]
        i = 0
        while True:
            i += 1
            if i > 1000:
                # too much itterations, break
                self.auto_place()
                break
            x = randint(0, 9)
            y = randint(0, 9)
            self.board[y][x] = Cell.SHIP  # place ship in random cell
            if self.count_ships():
                # if any errors - wrong cell
                self.board[y][x] = Cell.EMPTY
            elif self.ships == [4, 3, 2, 1]:
                return ([[val.value for val in _] for _ in self.board])

    def count_all(self):
        # returns count of alive ship cells
        int_sum = 0
        for row in self.board:
            for i in row:
                if i == Cell.SHIP: int_sum += 1
        return int_sum

    def get_ships(self):
        return self.ships

    def get_base_board(self):
        return "".join("".join(str(x.value) for x in y) for y in self.board)
