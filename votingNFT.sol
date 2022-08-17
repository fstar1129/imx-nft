pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VotingNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    struct MetaData {
        uint256 tokenId;
        uint256 votes;
        uint256 dateCreation;
        uint256 expiryTime;
    }
    mapping(address => MetaData[]) public userData;

    constructor() public ERC721("VotingNFT", "VCN") {}

    function totalNFT(address userAddress) public view returns (uint256) {
        return userData[userAddress].length;
    }

    function isExpired(address userAddress, uint256 index)
        public
        view
        returns (bool)
    {
        return (userData[userAddress][index].expiryTime < block.timestamp);
    }

    function generateVotingCard(uint256 votes, uint256 expiryTime)
        public
        returns (uint256)
    {
        uint256 len = userData[msg.sender].length;
        if (
            len > 0 &&
            userData[msg.sender][len - 1].expiryTime > block.timestamp
        ) {
            revert("Last nft not yet expired");
        }
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        MetaData memory data = MetaData(
            newItemId,
            votes,
            block.timestamp,
            expiryTime
        );
        userData[msg.sender].push(data);
        _mint(msg.sender, newItemId);
        return newItemId;
    }
}
