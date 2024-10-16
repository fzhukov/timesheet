import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { UserService } from '@user/user.service';
import { Tokens } from './types';
import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Provider, Token, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { v4 } from 'uuid';
import { add } from 'date-fns';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async refreshTokens(refreshToken: string, agent: string): Promise<Tokens> {
    const token = await this.prismaService.token.delete({
      where: { token: refreshToken },
    });
    if (!token || new Date(token.exp) < new Date()) {
      throw new UnauthorizedException();
    }
    const user = await this.userService.findOne(token.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.generateTokens(user, agent);
  }

  async register(dto: RegisterDto) {
    const user = await this.userService.findOne(dto.email).catch((err) => {
      this.logger.error(err);
      return null;
    });
    if (user) {
      throw new ConflictException('User with this email already exist');
    }
    return this.userService.save(dto).catch((err) => {
      this.logger.error(err);
      return null;
    });
  }

  async login(dto: LoginDto, agent: string): Promise<Tokens> {
    const user = await this.userService
      .findOne(dto.email, true)
      .catch((err) => {
        this.logger.error(err);
        return null;
      });

    if (!user || !compareSync(dto.password, user.password)) {
      throw new UnauthorizedException('Wrong login or password');
    }

    return this.generateTokens(user, agent);
  }

  private async generateTokens(user: User, agent: string): Promise<Tokens> {
    const accessToken =
      'Bearer ' +
      this.jwtService.sign({
        id: user.id,
        email: user.email,
        roles: user.roles,
      });
    const refreshToken = await this.getRefreshToken(user.id, agent);
    return { accessToken, refreshToken };
  }

  private async getRefreshToken(userId: string, agent: string): Promise<Token> {
    const _token = await this.prismaService.token.findFirst({
      where: {
        userId,
        userAgent: agent,
      },
    });
    const token = _token?.token ?? '';
    return this.prismaService.token.upsert({
      where: { token },
      update: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
      },
      create: {
        token: v4(),
        exp: add(new Date(), { months: 1 }),
        userId,
        userAgent: agent,
      },
    });
  }

  deleteRefreshToken(token: string) {
    return this.prismaService.token.delete({ where: { token } });
  }

  async providerAuth(email: string, agent: string, provider: Provider) {
    const findedUser = await this.userService.findOne(email);
    if (findedUser) {
      return this.generateTokens(findedUser, agent);
    }
    const newUser = this.userService
      .save({ email, password: 'qwerty', provider })
      .catch((err) => {
        this.logger.error(err);
        return null;
      });
    if (!newUser) {
      throw new HttpException(
        `Can't successfully create user with email ${email}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
