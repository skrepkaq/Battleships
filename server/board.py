from random import randint

class Board():
    def __init__(self):
        self.board = [[0 for _ in range(10)] for _ in range(10)] #0 - empty    1 - ship    2 - NaN    3 - dead    4 - miss    5 - hit
        self.ships = [0, 0, 0, 0] #four 1, tri 2, two 3, single 4
    

    def place(self, num, state):
        self.board[int(num/10)][num%10] = state
        arr_brd = ([[cell for cell in row] for row in self.board])
        for error in self.ship_count():
            arr_brd[error[1]][error[0]] = 3
        return arr_brd

    def shot(self, num):
        change_turn = False
        x = num%10
        y = int(num/10)
        brd = self.board
        if brd[y][x] in (3, 4, 5): return False #alr shot
        if brd[y][x] == 0: #miss
            brd[y][x] = 4
            change_turn = True
        else:              #hit
            brd[y][x] = 5
            self.kill_check(self.board, x, y)
        return ([[x if x != 1 else 0 for x in y] for y in brd]), change_turn


    def ship_count(self):
        def check_vert_neis(x, y):
            if 0<=y-1<10:
                if self.board[y-1][x] == 1: return True
            if 0<=y+1<10:
                if self.board[y+1][x] == 1: return True
            return False

        def check_ship_end(x, y, swap):
            if swap == 1:
                if y == 9: return True
                if self.board[y+1][x] == 0: return True
                return False
            else:
                if x == 9: return True
                if self.board[y][x+1] == 0: return True
                return False

        def check_corners(x, y):
            corners_shift = [[-1,-1],
                            [+1,-1],
                            [-1,+1],
                            [+1,+1]]
            for i in range(4):
                shifted_x = x + corners_shift[i][1]
                shifted_y = y + corners_shift[i][0]
                if 0 <= shifted_x < 10 and 0 <= shifted_y < 10:
                    if self.board[shifted_y][shifted_x] == 1: return True
            return False


        self.ships = [0, 0, 0, 0]
        errors = set()
        for swap in range(2):
            for y in range(10):
                combo = 0
                for x in range(10):
                    axis1, axis2 = x, y
                    if swap == 1: axis1, axis2 = axis2, axis1
                    if self.board[axis2][axis1] == 1:
                        combo += 1
                        if check_corners(axis1, axis2):
                            errors.add((axis1, axis2))
                    if combo > 0 and check_ship_end(axis1, axis2, swap):
                        if combo == 1:
                            if swap or check_vert_neis(axis1, axis2):
                                combo = 0
                        if 0<combo<=4:
                            self.ships[combo-1] += 1
                            if self.ships[combo-1] > 5-combo:
                                for c in range(combo):
                                    if swap == 1:
                                        errors.add((axis1, axis2-c))
                                    else:
                                        errors.add((axis1-c, axis2))
                        elif combo > 0:
                            errors.add((axis1, axis2))
                        combo = 0
        return errors


    def kill_check(self, brd, x, y):
        def check_step(x, y):
            x += shift_map[i][0]
            y += shift_map[i][1]
            if 0<=x<10 and 0<=y<10:
                cell = brd[y][x]
                global alive
                global last_cords
                if cell == 1:
                    alive = True
                elif cell == 5:
                    last_cords = [x, y, i]
                    check_step(x, y)

        def miss_step(x, y, i):
            if 0<=x<10 and 0<=y<10:
                if brd[y][x] == 5:
                    for x_s in range(-1,2):
                        for y_s in range(-1,2):
                            pX = x+x_s
                            pY = y+y_s
                            if 0<=pX<10 and 0<=pY<10:
                                if brd[pY][pX] == 0: brd[pY][pX] = 4
                    brd[y][x] = 3
                    miss_step(x+shift_map[i][0],y+shift_map[i][1], i)

        global alive
        global last_cords
        alive = False
        last_cords = []
        shift_map = [[0,-1],
                     [0,1],
                     [1,0],
                     [-1,0]]
        shift_shift_map = [1,0,3,2]
        for i in range(4):
            check_step(x, y)
        if alive == False:
            if last_cords:
                miss_step(last_cords[0],last_cords[1],shift_shift_map[last_cords[2]])
            else:
                miss_step(x, y, 0)
    
    
    def auto_place(self):
        self.board = [[0 for _ in range(10)] for _ in range(10)]
        i = 0
        while True:
            i+=1
            if i > 1000:
                self.auto_place()
                break
            x = randint(0,9)
            y = randint(0,9)
            self.board[y][x] = 1
            if self.ship_count():
                self.board[y][x] = 0
            elif self.ships == [4,3,2,1]:
                return self.board


    def count_all(self):
        int_sum = 0
        for row in self.board:
            for i in row:
                if i == 1: int_sum += 1
        return int_sum


    def get_ships(self):
        return self.ships

    def get_base_board(self):
        return "".join("".join(str(x) for x in y) for y in self.board)
