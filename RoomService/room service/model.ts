import { Sequelize, DataTypes } from 'sequelize';

export default (sequelize: Sequelize) => {
    const Room = sequelize.define('Room', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        capacity: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        timestamps: false,
        tableName: 'rooms'
    });
    Room.associate = (models) => {
        Room.belongsToMany(models.User, { through: 'UserRoom', as: 'users' });
    };
    return Room;
};
