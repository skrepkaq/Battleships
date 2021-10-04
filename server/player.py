from board import Board


class Player:
    def __init__(self, user):
        self.user = user
        self.board = Board()
        self.placed = False

    def reset(self):
        self.board = Board()
        self.placed = False

    def get_placed(self):
        return self.placed
