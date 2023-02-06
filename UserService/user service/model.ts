import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';

class User extends Model {
    public id!: number;
    public email!: string;
    public password!: string;
    public rooms!: number[];

    public async isValidPassword(password: string): Promise<boolean> {
        return await bcrypt.compare(password, this.password);
    }
}

User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    rooms: {
        type: DataTypes.ARRAY(DataTypes.INTEGER)
    }
}, {
    sequelize: db,
    modelName: 'users',
    hooks: {
        beforeCreate: async (user: User) => {
            user.password = await bcrypt.hash(user.password, 10);
        }
    }
});

export default User;
